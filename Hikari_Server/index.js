const server = require("http").createServer();
const io = require("socket.io")(server);
const login = require("./auth/login");
const md5 = require("md5-node");
const Queue = require("./module/queue.js");
var dbcfg = require("./module/dbconfig");
var mysql = require("mysql");
//socket连接列表
var connectionList = {};

var result_list = {};

/**
 * (待完善）验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname
 * @param {string} passwd
 * @param {Function} callback
 */

function validate_user(socket, token, uname, passwd, callback) {
  login.validate_userdata_mysql(uname, passwd, function (data) {
    if (data["code"] == "success") {
      socket.emit("LOGIN_SUCCESS", {
        uid: data["result"]["id"],
        uname: uname,
        token: token,
      });
      callback(data["result"]["id"], uname, passwd);
    } else {
      socket.emit("LOGIN_FAILED", {
        uid: -1,
        uname: uname,
        token: token,
      });
      console.log("valid Failed.");
    }
  });
}

/**
 * (待完善）获取一组数据
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
    result = JSON.parse(result[0]["data"]);

    if (grp_id == -1) {
      callback(result.length);
    } else {
      callback({
        input: result[grp_id - 1].in,
        output: result[grp_id - 1].out,
      },grp_id);
    }
  });
}

/**
 * (待完善）将评测记录保存至数据库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_db(rid) {
  console.log("To Save " + rid);
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
    result_list[cur_rid].grp_rec = {};

    Queue.push(data, function (uid, pid, code) {
      if (connectionList[socketId].uid == uid) {
        get_problem_data(pid, -1, function (tot_grp) {
          for (i = 1; i <= tot_grp; i++) {
            get_problem_data(pid, i, function (c_data,grp_id) {
              result_list[cur_rid].grp_rec[grp_id] = new Object();
              result_list[cur_rid].grp_rec[grp_id].exist = false;
              socket.emit("judge_pull", {
                rid: cur_rid,
                pid: pid,
                grp: grp_id,
                code: code,
                input: c_data.input,
                output: c_data.output,
              });
            });
          }
        });
      }
    });
  });

  socket.on("judge_push_result", function (data) {
    if (!result_list[data.rid].grp_rec[data.grp].exist) {
      result_list[data.rid].cnt += 1;
      result_list[data.rid].grp_rec[data.grp].exist = true;
      result_list[data.rid].grp_rec[data.grp].status = data.status;
      result_list[data.rid].grp_rec[data.grp].pts = data.pts;
      result_list[data.rid].grp_rec[data.grp].out = data.out;
      result_list[data.rid].pts += data.pts;
      get_problem_data(data.pid, -1,function(datacnt){
        if (result_list[data.rid].cnt == datacnt) {
          save_result_to_db(data.rid);
        }
      })
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
