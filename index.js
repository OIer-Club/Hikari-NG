const server = require("http").createServer(function (request, response) {
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end("<h1>Hikari-Server Running...</h1>\n");
});

const io = require("socket.io")(server);
const login = require("./auth/login");
const Queue = require("./module/queue.js");
var dbcfg = require("./module/dbconfig");
const fs = require('fs');

var mysql = require("mysql");
//socket连接列表
var connectionList = {};

var result_list = {};

/**
 * 字符串转base64
 * @param {string} str 
 * @returns 
 */
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
  work_dir = __dirname + "/data/" + pid;
  const file = fs.readdirSync(work_dir);

  if (grp_id == -1){
    callback(file.length/2);
  }else{
    var fin = fs.readFileSync(work_dir + "/" + file[grp_id*2-2]),
        fout = fs.readFileSync(work_dir + "/" + file[grp_id*2-1]);
      
    callback({
      input : fin,
      output : fout
    },grp_id);
  }
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
function save_result_to_valid(rid, code, input, output) {
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
    input +
    "','" +
    output +
    "')";

  con.query(sql, function (err) {
    if (err) {
      console.error(err);
    }
    con.end();
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
        connectionList[socketId].uid = uid;
        connectionList[socketId].username = uname;
        connectionList[socketId].password = passwd;
        console.log(data.username + " logged in.");
      }
    );
  });

  //用户提交评测
  socket.on("submit", function (data) {
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
            result_list[data.rid].stat = "AC";
            for (i = 1; i <= datacnt; i += 1) {
              if (result_list[data.rid].grp_rec[i].status != "AC") {
                result_list[data.rid].stat =
                  result_list[data.rid].grp_rec[i].status;
                break;
              }
            }

            for (i = 1; i <= datacnt; i += 1){
              delete result_list[data.rid].grp_rec[i].exist;
              delete result_list[data.rid].grp_rec[i].valid_code;
              delete result_list[data.rid].grp_rec[i].valid_in;
              delete result_list[data.rid].grp_rec[i].valid_out;
            }

            save_result_to_db(
              data.rid,
              data.pid,
              data.uid,
              result_list[data.rid].code,
              result_list[data.rid].stat,
              result_list[data.rid].pts,
              JSON.stringify(result_list[data.rid].grp_rec)
            );
            if (result_list[data.rid].stat == "AC" && data.in.length <= 100 && data.out.length <= 100 && data.code.length <= 500){
              save_result_to_valid(data.rid, data.code, data.in, data.out);
            }
            io.emit("judge_all_done", {
              rid: data.rid,
              uid: data.uid,
              pid: data.pid,
              pts: result_list[data.rid].pts,
              datacnt: datacnt,
              stat: result_list[data.rid].stat,
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
    console.log(connectionList[socketId].username + " logged out.");
    delete connectionList[socketId];
  });
});
server.listen(1919);
console.log("Server listening on port 1919.");