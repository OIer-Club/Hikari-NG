var cntInQueue = 0;
var userLoggedin = 0;
const server = require("http").createServer(function (request, response) {
  response.writeHead(200, { "Content-Type": "text/json" });
  response.end('{"status":"200","online":"' + userLoggedin + '","inqueue":"' + cntInQueue + '"}\n');
});

const io = require("socket.io")(server);
const login = require("./auth/login");

const Queue = require("./module/queue.js");
var dbcfg = require("./module/dbconfig");
var mysql = require("mysql");
//socket连接列表
var connectionList = {};

var result_list = {};

function stringToBase64(str){
    var base64Str = new Buffer(str).toString('base64');
    return base64Str;
}

/**
 * 验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname
 * @param {string} passwd
 * @param {Function} callback
 */

function validate_user(socket, token, uname, passwd, callback) {
  login.validate_userdata_mysql(uname, passwd, function (data) {
    if (data["code"] == "success") {
      io.emit("LOGIN_SUCCESS", {
        uid: data["result"]["id"],
        uname: uname,
        token: token,
      });
      callback(data["result"]["id"], uname, passwd);
    } else {
      io.emit("LOGIN_FAILED", {
        uid: -1,
        uname: uname,
        token: token,
      });
      console.log("valid Failed.");
    }
  });
}

/**
 * 获取一组数据
 * @param {integer} pid : 题目编号
 * @param {integer} grp_id : 第几组数据
 * @returns :该组数据的输入输出
 */

function get_problem_data(pid, grp_id, callback) {
  var con = mysql.createConnection({
    host: dbcfg.host,
    user: dbcfg.user,
    password: dbcfg.password,
    database: dbcfg.database,
  });
  con.connect();
  var sql = "SELECT * FROM `problem` WHERE id in('" + pid + "')";

  con.query(sql, function (err, result) {
    if (err) {
      return data;
    }

    //var len = result.length;
    //console.log("Len: " + len);
    if (result.length == 0){
        callback(-1);
    }else if (result[0]["hidden"] != 0){
        callback(-1);
    }else{
        result = JSON.parse(result[0]["data"]);
    
        con.end();
        if (grp_id == -1) {
          callback(result.length);
        } else {
          callback(
            {
              input: result[grp_id - 1].in,
              output: result[grp_id - 1].out,
            },
            grp_id
          );
        }
    }
  });
}

/**
 * 获取时空限制
 * @param {integer} pid : 题目编号
 * @returns :该组数据的输入输出
 */

function get_problem_limits(pid, callback) {
  var con = mysql.createConnection({
    host: dbcfg.host,
    user: dbcfg.user,
    password: dbcfg.password,
    database: dbcfg.database,
  });
  con.connect();
  var sql = "SELECT * FROM `problem` WHERE id in('" + pid + "')";

  con.query(sql, function (err, result) {
    if (err) {
      return data;
    }
    con.end();
    callback({
      time_limit: result[0]["time_limit"],
      mem_limit: result[0]["mem_limit"],
    });
  });
}

/**
 * 将评测记录保存至数据库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_db(rid, pid, uid, code, stat, pts, detail) {
  var con = mysql.createConnection({
    host: dbcfg.host,
    user: dbcfg.user,
    password: dbcfg.password,
    database: dbcfg.database,
  });
  con.connect();
  var sql =
    "INSERT INTO `record` (rid,pid,uid,code,stat,pts,detail) VALUES (" +
    rid +
    "," +
    pid +
    "," +
    uid +
    ",'" +
    code +
    "','" +
    stat +
    "'," +
    pts +
    ",'" +
    stringToBase64(detail) +
    "')";

  con.query(sql, function (err) {
    if (err) {
      console.error(err);
    }
    con.end();
  });
}

/**
 * 将评测记录保存至Valid库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_valid(rid, code, pid, grp) {
  get_problem_data(pid,grp,function(data,grp_id){
      var con = mysql.createConnection({
        host: dbcfg.host,
        user: dbcfg.user,
        password: dbcfg.password,
        database: dbcfg.database,
      });
      con.connect();
      var sql =
        "INSERT INTO `reliable_judge` (rid,code,input,output) VALUES (" +
        rid +
        ",'" +
        code +
        "','" +
        data.input +
        "','" +
        data.output +
        "')";
    
      con.query(sql, function (err) {
        if (err) {
          console.error(err);
        }
        con.end();
      });
      });
}

/**
 * 生成验证代码和数据
 * @param {function} callback : 回调函数
 */
function generate_validate_code(callback) {
  var con = mysql.createConnection({
    host: dbcfg.host,
    user: dbcfg.user,
    password: dbcfg.password,
    database: dbcfg.database,
  });
  con.connect();
  var sql = "SELECT * FROM  reliable_judge WHERE id >= ((SELECT MAX(id) FROM reliable_judge)-(SELECT" + 
  "      MIN(id) FROM reliable_judge)) * RAND() + (SELECT MIN(id) FROM reliable_judge) LIMIT 1";

  con.query(sql, function (err, result) {
    if (err) {
      return data;
    }
    con.end();
    
    callback({
      code: result[0]["code"],
      input: result[0]["input"],
      output: result[0]["output"],
    });
  });
}
/*
 * socket主进程
 */
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
    validate_user(
      socket,
      socketId,
      data.username,
      data.password,
      function (uid, uname, passwd) {
        userLoggedin+=1;
        connectionList[socketId].loggedin=true;
        connectionList[socketId].uid = uid;
        connectionList[socketId].username = uname;
        connectionList[socketId].password = passwd;
        console.log(data.username + " logged in.");
      }
    );
  });

  //用户提交评测
  socket.on("submit", function (data) {
    get_problem_data(data.pid, -1, function (tot_grp){
        if (tot_grp == -1){
            io.emit("judge_all_done", {
              uid: data.uid,
              pid: data.pid,
              pts: 0,
              datacnt: 1,
              stat: "Problem NOT FOUND",
            });
        }
    });
    
    var cur_rid = Date.now();
    data.rid = cur_rid;

    //初始化评测记录
    result_list[cur_rid] = new Object();
    result_list[data.rid].cnt = 0;
    result_list[data.rid].pts = 0;
    result_list[data.rid].code = data.code;
    //result_list[data.rid].pid = data.pid;
    result_list[cur_rid].grp_rec = {};
    
    Queue.push(data, function (uid, pid, code) {
      if (connectionList[socketId].uid == uid) {
        cntInQueue += 1;
        get_problem_data(pid, -1, function (tot_grp) {
          for (i = 1; i <= tot_grp; i++) {
            get_problem_data(pid, i, function (c_data, grp_id) {
              get_problem_limits(pid, function (lim_data) {
                generate_validate_code(function (_valid) {
                  result_list[cur_rid].grp_rec[grp_id] = new Object();
                  result_list[cur_rid].grp_rec[grp_id].exist = false;
                  result_list[cur_rid].grp_rec[grp_id].valid_code = _valid.code;
                  result_list[cur_rid].grp_rec[grp_id].valid_in = _valid.input;
                  result_list[cur_rid].grp_rec[grp_id].valid_out = _valid.output;
                  console.log("Pulled Test " + grp_id + " of RID " + cur_rid);
                  console.log("Length of In: " + c_data.input.length + ", Output: " + c_data.output.length);
                  if (c_data.input.length <= 5000000 && c_data.output.length <= 5000000){
                      if (userLoggedin <= 5){
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
                      }else{
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
                  }else{
                    console.log("Data too large, Abort.");
                    result_list[cur_rid].cnt += 1;
                    result_list[cur_rid].grp_rec[grp_id].exist = true;
                    result_list[cur_rid].grp_rec[grp_id].status = "AC";
                    result_list[cur_rid].grp_rec[grp_id].pts = 1;
                    result_list[cur_rid].grp_rec[grp_id].out = "(Aborted)";
                    result_list[cur_rid].pts += 1;
                    get_problem_data(pid, -1, function (datacnt) {
                        io.emit("judge_pts_done", {
                            rid: cur_rid,
                            uid: uid,
                            pid: pid,
                            grp: grp_id,
                            pts: 1,
                            cnt_done: result_list[cur_rid].cnt,
                            datacnt : datacnt,
                            stat: "Aborted"
                        });
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
    if (result_list[data.rid].grp_rec[data.grp].valid_out == data.valid_out) {
      if (!result_list[data.rid].grp_rec[data.grp].exist) {
        console.log("Result Get! RID:" + data.rid + ",data.grp:" + data.grp);
        result_list[data.rid].cnt += 1;
        result_list[data.rid].grp_rec[data.grp].exist = true;
        result_list[data.rid].grp_rec[data.grp].status = data.status;
        result_list[data.rid].grp_rec[data.grp].pts = data.pts;
        result_list[data.rid].grp_rec[data.grp].out = data.out;
        result_list[data.rid].pts += data.pts;

        get_problem_data(data.pid, -1, function (datacnt) {
          io.emit("judge_pts_done", {
            rid: data.rid,
            uid: data.uid,
            pid: data.pid,
            grp: data.grp,
            pts: data.pts,
            cnt_done: result_list[data.rid].cnt,
            datacnt : datacnt,
            stat: data.status
          });
          if (result_list[data.rid].cnt == datacnt) {
            console.log("Judge All Done!" + data.rid);
            cntInQueue -=1;
            result_list[data.rid].stat = "AC";
            for (i = 1; i <= datacnt; i += 1) {
              if (result_list[data.rid].grp_rec[i].status != "AC") {
                result_list[data.rid].stat =
                  result_list[data.rid].grp_rec[i].status;
                break;
              }
            }

            /*
            for (i = 1; i <= datacnt; i += 1){
              delete result_list[data.rid].grp_rec[i].exist;
              delete result_list[data.rid].grp_rec[i].valid_code;
              delete result_list[data.rid].grp_rec[i].valid_in;
              delete result_list[data.rid].grp_rec[i].valid_out;
            }*/

            save_result_to_db(
              data.rid,
              data.pid,
              data.uid,
              result_list[data.rid].code,
              result_list[data.rid].stat,
              result_list[data.rid].pts,
              JSON.stringify(result_list[data.rid].grp_rec)
            );
            if (result_list[data.rid].stat == "AC"){
                get_problem_data(data.pid,-1,function(cnt_grp){
                    save_result_to_valid(data.rid, data.code, data.pid, Math.floor(Math.random()*10)+1);
                });
            }
            io.emit("judge_all_done", {
              rid: data.rid,
              uid: data.uid,
              pid: data.pid,
              pts: result_list[data.rid].pts,
              datacnt: datacnt,
              stat: result_list[data.rid].stat
            });
          }else{
            console.log("Judge " + data.rid + ": " + result_list[data.rid].cnt + " Out of " + datacnt);
          }
        });
      }
    } else {
      console.log(result_list[data.rid]);
      console.log("User " + data.uid + " Seems to be a Scam...");
    }
  });

  //用户离开
  socket.on("disconnect", function () {
    if (connectionList[socketId].loggedin == true){
        userLoggedin -= 1;
        console.log(connectionList[socketId].username + " logged out.");
    }
    
    delete connectionList[socketId];
  });
});
server.listen(1919);
console.log("Server listening on port 1919.");
