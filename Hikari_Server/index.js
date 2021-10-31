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
var md5 = require("md5-node");

//socket连接列表

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
  ojcfg.connectionList[socketId] = {
    socket: socket,
    token: socketId, //十六位Token
  };

  //用户登录事件
  socket.on("login", function (data) {
      ojcfg.connectionList[socketId].info = data.info;
    login.validate_user(
      socketId,
      data.username,
      data.password,
      function (uid, uname, passwd, grade) {
        ojcfg.userLoggedin += 1;
        ojcfg.connectionList[socketId].loggedin = true;
        ojcfg.connectionList[socketId].uid = uid;
        ojcfg.connectionList[socketId].username = uname;
        ojcfg.connectionList[socketId].password = passwd;
        ojcfg.connectionList[socketId].grade = grade;
        console.log(data.username + " of Grade " + grade + " logged in.");
      }
    );
  });

  //用户提交评测
  socket.on("submit", function (data) {
    problem.get_problem_data(socketId, data.pid, -1, function (tot_grp) {
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
    ojcfg.result_list[cur_rid] = new Object();
    ojcfg.result_list[cur_rid].all_done = false;
    ojcfg.result_list[data.rid].cnt = 0;
    ojcfg.result_list[data.rid].pts = 0;
    ojcfg.result_list[data.rid].code = data.code;
    //ojcfg.result_list[data.rid].pid = data.pid;
    ojcfg.result_list[cur_rid].grp_rec = {};

    Queue.push(data, function (uid, pid, code) {
      if (ojcfg.connectionList[socketId].uid == uid) {
        ojcfg.cntInQueue += 1;
        problem.get_problem_data(socketId, pid, -1, function (tot_grp) {
          for (i = 1; i <= tot_grp; i++) {
            problem.get_problem_data(socketId, pid, i, function (c_data, grp_id) {
              problem.get_problem_limits(pid, function (lim_data) {
                  ojcfg.result_list[cur_rid].grp_rec[grp_id] = new Object();
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].exist = false;
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].db_out = md5(request('GET',c_data.output).getBody().toString().replace(/\s*/g, "").replace(/[\r\n]/g, "").replace(/[\n]/g, ""));
                  console.log("Pulled Test " + grp_id + " of RID " + cur_rid);
                  if (io.engine.clientsCount <= 5) {
                    io.emit("judge_pull", {
                      rid: cur_rid,
                      uid: uid,
                      pid: pid,
                      grp: grp_id,
                      code: code,
                      input: c_data.input,
                      time_limit: lim_data.time_limit,
                      mem_limit: lim_data.mem_limit,
                    });
                  } else {
                    socket.broadcast.emit("judge_pull", {
                      rid: cur_rid,
                      uid: uid,
                      pid: pid,
                      grp: grp_id,
                      code: code,
                      input: c_data.input,
                      time_limit: lim_data.time_limit,
                      mem_limit: lim_data.mem_limit,
                    });
                  }
              });
            });
          }
        });
      }
    });
  });

  socket.on("judge_push_result", function (data) {
    if (!ojcfg.result_list[data.rid].all_done) {
      if (!ojcfg.result_list[data.rid].grp_rec[data.grp].exist) {
        var is_ac = (data.out == ojcfg.result_list[data.rid].grp_rec[data.grp].db_out);
        console.log("Result Get! RID:" + data.rid + ",data.grp:" + data.grp);
        ojcfg.result_list[data.rid].cnt += 1;
        ojcfg.result_list[data.rid].grp_rec[data.grp].exist = true;
        ojcfg.result_list[data.rid].grp_rec[data.grp].status = (data.status!="OK"?data.status:(is_ac?"AC":"WA"));
        ojcfg.result_list[data.rid].grp_rec[data.grp].pts = (is_ac?1:0);
        ojcfg.result_list[data.rid].grp_rec[data.grp].out = data.out;
        ojcfg.result_list[data.rid].pts += (is_ac?1:0);

        problem.get_problem_data(socketId, data.pid, -1, function (datacnt) {
          io.emit("judge_pts_done", {
            rid: data.rid,
            uid: data.uid,
            pid: data.pid,
            grp: data.grp,
            pts: (is_ac?1:0),
            cnt_done: ojcfg.result_list[data.rid].cnt,
            datacnt: datacnt,
            stat: ojcfg.result_list[data.rid].grp_rec[data.grp].status,
          });
          if (ojcfg.result_list[data.rid].cnt == datacnt && !ojcfg.result_list[data.rid].all_done) {
            console.log("Judge All Done!" + data.rid);
            ojcfg.cntInQueue -= 1;
            ojcfg.result_list[data.rid].stat = "AC";
            for (i = 1; i <= datacnt; i += 1) {
              if (ojcfg.result_list[data.rid].grp_rec[i].status != "AC") {
                ojcfg.result_list[data.rid].stat =
                  ojcfg.result_list[data.rid].grp_rec[i].status;
                break;
              }
            }

            for (i = 1; i <= datacnt; i += 1) {
              delete ojcfg.result_list[data.rid].grp_rec[i].exist;
            }

            record.save_result_to_db(
              data.rid,
              data.pid,
              data.uid,
              ojcfg.result_list[data.rid].code,
              ojcfg.result_list[data.rid].stat,
              ojcfg.result_list[data.rid].pts,
              JSON.stringify(ojcfg.result_list[data.rid].grp_rec)
            );

            ojcfg.result_list[data.rid].all_done = true;
            io.emit("judge_all_done", {
              rid: data.rid,
              uid: data.uid,
              pid: data.pid,
              pts: ojcfg.result_list[data.rid].pts,
              datacnt: datacnt,
              stat: ojcfg.result_list[data.rid].stat,
            });
          } else {
            console.log(
              "Judge " +
                data.rid +
                ": " +
                ojcfg.result_list[data.rid].cnt +
                " Out of " +
                datacnt
            );
          }
        });
      }
    } else {
      console.log(ojcfg.result_list[data.rid].grp_rec[data.grp]);
      console.log("User " + data.uid + " Seems to be a Scam...");
    }
  });

  //用户离开
  socket.on("disconnect", function () {
    if (ojcfg.connectionList[socketId].loggedin == true) {
      ojcfg.userLoggedin -= 1;
      console.log(ojcfg.connectionList[socketId].username + " logged out.");
    }

    delete ojcfg.connectionList[socketId];
  });
});

server.listen(1919);
console.log("Server listening on port 1919.");

module.exports = {
  io,
};
