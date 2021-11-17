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

process.on('uncaughtException', function (err) {
  console.error(err.stack);
});

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
  console.log("[index.js] " + socketId + " Connection Established.");
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
        ojcfg.connectionList[socketId].grade = grade; //用户等级
        console.log("[index.js] " + data.username + " of Grade " + grade + " logged in.");
      }
    );
  });

  //用户提交评测
  socket.on("submit", function (data) {
    problem.get_problem_data(socketId, data.pid, -1, function (tot_grp) {
      if (tot_grp == -1) {  //题目不存在或为隐藏
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
    var cur_rid = Date.now();   //生成RID
    data.rid = cur_rid;

    //初始化评测记录
    ojcfg.result_list[cur_rid] = {};
    ojcfg.result_list[cur_rid].all_done = false;
    ojcfg.result_list[cur_rid].socketId = socketId;
    ojcfg.result_list[data.rid].cnt = 0;
    ojcfg.result_list[data.rid].pts = 0;
    ojcfg.result_list[data.rid].rid = data.rid;
    ojcfg.result_list[data.rid].uid = data.uid;
    ojcfg.result_list[data.rid].pid = data.pid;
    ojcfg.result_list[data.rid].timestamp = Date.now();
    ojcfg.result_list[data.rid].code = data.code;
    //ojcfg.result_list[data.rid].pid = data.pid;
    ojcfg.result_list[cur_rid].grp_rec = {};

    Queue.push(data, function (uid, pid, code) {
      if (ojcfg.connectionList[socketId].uid == uid) { //提交者是本人
        ojcfg.cntInQueue += 1;
        problem.get_problem_data(socketId, pid, -1, function (tot_grp) { //获取数据组数
          ojcfg.result_list[data.rid].tot_grp = tot_grp;
          for (i = 1; i <= tot_grp; i++) {
            problem.get_problem_data(socketId, pid, i, function (c_data, grp_id) { //获取当前数据点输入输出文件
              problem.get_problem_limits(pid, function (lim_data) { //获取当前数据点时空限制
                  ojcfg.result_list[cur_rid].grp_rec[grp_id] ={};
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].timestamp = Date.now();
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].exist = false;
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].time_limit = lim_data.time_limit;
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].mem_limit = lim_data.mem_limit;
                  ojcfg.result_list[cur_rid].grp_rec[grp_id].db_out = md5(request('GET',c_data.output).getBody().toString().replace(/\s*/g, "").replace(/[\r\n]/g, "").replace(/[\n]/g, ""));//答案文件的MD5
                  console.log("[index.js] Pulled Test " + grp_id + " of RID " + cur_rid);
                  if (io.engine.clientsCount <= 5) {
                    socket.emit("judge_pull", {//(临时性措施以避免BUG，待修改) 应向全部人发出评测申请，以防评测效率过低
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
                    socket.broadcast.emit("judge_pull", {//向除了该人之外的其他人发出评测申请
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
    record.tackle_pts_done(data);
  });

  //用户离开
  socket.on("disconnect", function () {
    if (ojcfg.connectionList[socketId].loggedin == true) {
      ojcfg.userLoggedin -= 1;
      console.log("[index.js] " + ojcfg.connectionList[socketId].username + " logged out.");
    }

    delete ojcfg.connectionList[socketId];
  });
});

/** 
    重发评测失败的数据点 （有锅）

function grp_overtime_re_emit(){
    for (var it_rid in ojcfg.result_list){
        if (Date.now() - ojcfg.result_list[it_rid].timestamp > 1000*60*5){ //超时
            if (!ojcfg.result_list[it_rid].all_done){ //未完成
                for (var i = 1;i<=ojcfg.result_list[it_rid].tot_grp;i+=1){
                    if (i <= ojcfg.result_list[it_rid].tot_grp && ojcfg.result_list[it_rid].grp_rec.hasOwnProperty(i) && !ojcfg.result_list[it_rid].grp_rec[i].exist){ //未完成
                      record.tackle_pts_done({
                        rid: ojcfg.result_list[it_rid].rid,
                        uid: ojcfg.result_list[it_rid].uid,
                        pid: ojcfg.result_list[it_rid].pid,
                        grp: i,
                        code: ojcfg.result_list[it_rid].code,
                        compile_info : "Judge Failed.",
                        status: "UKE",
                        out: "Judge Failed.",
                      });
                    }
                }
            }else{
                delete ojcfg.result_list[it_rid]; //已完成则删除
            }
        }
    }
}
setInterval(grp_overtime_re_emit,1000*60*2); //2分钟轮询一次
*/

server.listen(1919);
console.log("[index.js] Server listening on port 1919.");

module.exports = {
  io,
};
