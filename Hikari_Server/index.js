/**
 * Hikari-Server
 * Powered by Clearwave of Hikari-Dev
 *
 * Folder Sturcture:
 * - module
 *   - login.js : 登录验证相关
 *   - ojconfig.js : 常量
 *   - problem.js : 题目数据相关
 *   - queue.js : 评测队列相关
 *   - record.js : 评测记录相关
 */

var ojcfg = require("./module/ojconfig");
const server = ojcfg.server;

const io = ojcfg.io;
const login = require("./module/login.js");
const Queue = require("./module/queue.js");
const problem = require("./module/problem");
const record = require("./module/record");
const sensorship = require("./module/sensorship");

var request = require("sync-request");

//socket连接列表
var connectionList = ojcfg.connectionList;
var result_list = ojcfg.result_list;

/*
 * socket主进程
 */

io.engine.on("connection_error", (err) => {
  console.log(err.req); // the request object
  console.log(err.code); // the error code, for example 1
  console.log(err.message); // the error message, for example "Session ID unknown"
  console.log(err.context); // some additional error context
});

io.sockets.on("connection", function (socket) {
  //客户端连接时，保存socketId和用户名
  var socketId = socket.id;
  console.log(socketId + " Connection Established.");
  connectionList[socketId] = {
    socket: socket,
    token: socketId, //十六位Token
  };

  //用户登录事件
  socket.on("login", function (data) {
    login.validate_user(
      socketId,
      data.username,
      data.password,
      function (uid, uname, passwd) {
        ojcfg.userLoggedin += 1;
        connectionList[socketId].loggedin = true;
        connectionList[socketId].uid = uid;
        connectionList[socketId].username = uname;
        connectionList[socketId].password = passwd;
        console.log(data.username + " logged in.");
      }
    );
  });

  //用户提交评测
  socket.on("submit", function (data) {
    problem.get_problem_data(data.pid, -1, function (tot_grp) {
      if (tot_grp == -1) {
        io.emit("judge_all_done", {
          uid: data.uid,
          pid: data.pid,
          pts: 0,
          datacnt: 1,
          stat: "Problem NOT FOUND",
        });
      }
    });

    data.code = sensorship.sensor(data.code);
    var cur_rid = Date.now();
    data.rid = cur_rid;

    //初始化评测记录
    result_list[cur_rid] = new Object();
    result_list[cur_rid].all_done = false;
    result_list[data.rid].cnt = 0;
    result_list[data.rid].pts = 0;
    result_list[data.rid].code = data.code;
    //result_list[data.rid].pid = data.pid;
    result_list[cur_rid].grp_rec = {};

    Queue.push(data, function (uid, pid, code) {
      if (connectionList[socketId].uid == uid) {
        ojcfg.cntInQueue += 1;
        problem.get_problem_data(pid, -1, function (tot_grp) {
          for (i = 1; i <= tot_grp; i++) {
            problem.get_problem_data(pid, i, function (c_data, grp_id) {
              problem.get_problem_limits(pid, function (lim_data) {
                record.generate_validate_code(function (_valid) {
                  result_list[cur_rid].grp_rec[grp_id] = new Object();
                  result_list[cur_rid].grp_rec[grp_id].exist = false;
                  result_list[cur_rid].grp_rec[grp_id].valid_code = _valid.code;
                  result_list[cur_rid].grp_rec[grp_id].valid_in = _valid.input;
                  result_list[cur_rid].grp_rec[grp_id].valid_out =
                    _valid.output;
                  console.log("Pulled Test " + grp_id + " of RID " + cur_rid);
                  if (io.engine.clientsCount <= 5) {
                    io.emit("judge_pull", {
                      rid: cur_rid,
                      uid: uid,
                      pid: pid,
                      grp: grp_id,
                      code: code,
                      input: c_data.input,
                      output: c_data.output,
                      time_limit: lim_data.time_limit,
                      mem_limit: lim_data.mem_limit,
                      valid_code: _valid.code,
                      valid_in: _valid.input,
                    });
                  } else {
                    socket.broadcast.emit("judge_pull", {
                      rid: cur_rid,
                      uid: uid,
                      pid: pid,
                      grp: grp_id,
                      code: code,
                      input: c_data.input,
                      output: c_data.output,
                      time_limit: lim_data.time_limit,
                      mem_limit: lim_data.mem_limit,
                      valid_code: _valid.code,
                      valid_in: _valid.input,
                    });
                  }
                });
              });
            });
          }
        });
      }
    });
  });

  socket.on("judge_push_result", function (data) {
    var db_Valid_Out = request(
      "GET",
      result_list[data.rid].grp_rec[data.grp].valid_out
    ).getBody();
    if (!result_list[data.rid].all_done /*&& db_Valid_Out == data.valid_out*/) {
      if (!result_list[data.rid].grp_rec[data.grp].exist) {
        console.log("Result Get! RID:" + data.rid + ",data.grp:" + data.grp);
        result_list[data.rid].cnt += 1;
        result_list[data.rid].grp_rec[data.grp].exist = true;
        result_list[data.rid].grp_rec[data.grp].status = data.status;
        result_list[data.rid].grp_rec[data.grp].pts = data.pts;
        result_list[data.rid].grp_rec[data.grp].out = data.out;
        result_list[data.rid].pts += data.pts;

        problem.get_problem_data(data.pid, -1, function (datacnt) {
          io.emit("judge_pts_done", {
            rid: data.rid,
            uid: data.uid,
            pid: data.pid,
            grp: data.grp,
            pts: data.pts,
            cnt_done: result_list[data.rid].cnt,
            datacnt: datacnt,
            stat: data.status,
          });
          if (result_list[data.rid].cnt == datacnt) {
            console.log("Judge All Done!" + data.rid);
            ojcfg.cntInQueue -= 1;
            result_list[data.rid].stat = "AC";
            for (i = 1; i <= datacnt; i += 1) {
              if (result_list[data.rid].grp_rec[i].status != "AC") {
                result_list[data.rid].stat =
                  result_list[data.rid].grp_rec[i].status;
                break;
              }
            }

            for (i = 1; i <= datacnt; i += 1) {
              delete result_list[data.rid].grp_rec[i].exist;
              delete result_list[data.rid].grp_rec[i].valid_code;
              delete result_list[data.rid].grp_rec[i].valid_in;
              delete result_list[data.rid].grp_rec[i].valid_out;
            }

            record.save_result_to_db(
              data.rid,
              data.pid,
              data.uid,
              result_list[data.rid].code,
              result_list[data.rid].stat,
              result_list[data.rid].pts,
              JSON.stringify(result_list[data.rid].grp_rec)
            );
            if (result_list[data.rid].stat == "AC") {
              problem.get_problem_data(data.pid, -1, function (cnt_grp) {
                var grp_id = Math.floor(Math.random() * cnt_grp) + 1,
                  attempt = 0,
                  OK = false;

                while (!OK && attempt <= 5) {
                  attempt += 1;
                  var tmp_data = data;
                  problem.get_problem_data(
                    data.pid,
                    grp_id,
                    function (data, grp_cnt) {
                      if (!OK) {
                        if (
                          data.input.length <= 1000 &&
                          data.output.length <= 1000
                        ) {
                          record.save_result_to_valid(
                            tmp_data.rid,
                            tmp_data.code,
                            tmp_data.pid,
                            grp_id
                          );
                          OK = true;
                        } else {
                          grp_id = Math.floor(Math.random() * cnt_grp) + 1;
                        }
                      }
                    }
                  );
                }
              });
            }

            result_list[data.rid].all_done = true;
            io.emit("judge_all_done", {
              rid: data.rid,
              uid: data.uid,
              pid: data.pid,
              pts: result_list[data.rid].pts,
              datacnt: datacnt,
              stat: result_list[data.rid].stat,
            });
          } else {
            console.log(
              "Judge " +
                data.rid +
                ": " +
                result_list[data.rid].cnt +
                " Out of " +
                datacnt
            );
          }
        });
      }
    } else {
      console.log(result_list[data.rid].grp_rec[data.grp]);
      console.log("User " + data.uid + " Seems to be a Scam...");
    }
  });

  //用户离开
  socket.on("disconnect", function () {
    if (connectionList[socketId].loggedin == true) {
      ojcfg.userLoggedin -= 1;
      console.log(connectionList[socketId].username + " logged out.");
    }

    delete connectionList[socketId];
  });
});

server.listen(1919);
console.log("Server listening on port 1919.");

module.exports = {
  io,
};
