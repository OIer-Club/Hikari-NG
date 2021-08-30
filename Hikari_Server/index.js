const server = require("http").createServer();
const io = require("socket.io")(server);
const login = require("./auth/login");
const md5 = require("md5-node");
const Queue = require("./module/queue.js");
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
 * （待完善）获取题目数据组数
 * @param {integer} pid : 题目编号
 * @returns : 数据组数
 */
function get_problem_data_no(pid) {
  return 1;
}

/**
 * (待完善）获取一组数据
 * @param {integer} pid : 题目编号
 * @param {integer} grp_id : 第几组数据
 * @returns :该组数据的输入输出
 */

function get_problem_data(pid, grp_id) {
  pid = pid;
  if (grp_id == 1) {
    return {
      input: "1 2",
      output: "3",
    };
  } else {
    return {
      input: "11 20",
      output: "31",
    };
  }
}

/**
 * (待完善）将评测记录保存至数据库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_db(rid){
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
    result_list[cur_rid] = new Object;
    result_list[data.rid].cnt = 0;
    result_list[data.rid].pts = 0;
    result_list[cur_rid].grp_rec = {};

    Queue.push(data, function (uid, pid, code) {
      if (connectionList[socketId].uid == uid) {
        var tot_grp = get_problem_data_no(pid);
        for (i = 1; i <= tot_grp; i++) {
          result_list[cur_rid].grp_rec[i] = new Object;
          result_list[cur_rid].grp_rec[i].exist = false;
          socket.emit("judge_pull", {
            rid: cur_rid,
            pid: pid,
            grp: i,
            code: code,
            input: get_problem_data(pid, i).input,
            output: get_problem_data(pid, i).output,
          });
        }
      }
    });
  });

  socket.on("judge_push_result",function(data){

    if (!result_list[data.rid].grp_rec[data.grp].exist){
      result_list[data.rid].cnt += 1;
      result_list[data.rid].grp_rec[data.grp].exist = true;
      result_list[data.rid].grp_rec[data.grp].status = data.status;
      result_list[data.rid].grp_rec[data.grp].pts = data.pts;
      result_list[data.rid].grp_rec[data.grp].out = data.out;
      result_list[data.rid].pts += data.pts;

      if (result_list[data.rid].cnt == get_problem_data_no(data.pid)){
        save_result_to_db(data.rid);
      }
    }
  });

  //用户离开
  socket.on("disconnect", function () {
    console.log(data.username + " logged out.");
    delete connectionList[socketId];
  });
});
server.listen(1919);
console.log("Server listening on port 1919.");
