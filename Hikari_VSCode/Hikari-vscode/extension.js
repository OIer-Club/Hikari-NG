// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//OJ配置，请自行修改
const vscode = require("vscode");
var oj_url = vscode.workspace.getConfiguration().get("hikari-vscode.oj_url"); // OJ的网址
var uname = vscode.workspace.getConfiguration().get("hikari-vscode.uname"); //用户名
var passwd = vscode.workspace.getConfiguration().get("hikari-vscode.passwd"); //密码

console.log("OJ URL:" + oj_url);
var uname,
  passwd,
  uid = -1;
var pid_map = {}; //正在评测中的题目
var judge_inq = {};//正在编译的题目

const do_compile_out = require("./judge").do_compile_out; //编译模块

const io = require("socket.io-client");
const os = require("os");
// @ts-ignore

const socket = io(oj_url + ":1919"); //与服务端通信的socket
//const child_process = require("child_process");
const fs = require('fs');
const request = require("request");

var Queue = require('./queue.js'); //评测队列模块
var md5 = require("md5");

/**
 * 删除目录.
 * @param {string} path 待删除的目录
 */
function delDir(path){
  let files = [];
  if(fs.existsSync(path)){
      files = fs.readdirSync(path);
      // @ts-ignore
      // @ts-ignore
      // @ts-ignore
      files.forEach((file, index) => {
          let curPath = path + "/" + file;
          if(fs.statSync(curPath).isDirectory()){
              delDir(curPath); //递归删除文件夹
          } else {
              fs.unlinkSync(curPath); //删除文件
          }
      });
      fs.rmdirSync(path);
  }
}

/**
 *
 * @param {function} callback
 */
function validate_user(callback) {
  socket.emit("login", { //发送登录消息
    username: uname,
    password: passwd,
    info: '{"uname":"' + uname + '","arch":"' + os.arch() + '","cpu_model":"' + os.cpus()[0].model + '","cpu_count":"' + os.cpus().length + 
      '","speed":"' + os.cpus()[0].speed + '","mem":"' + Math.floor(os.freemem()/1024/1024) + '","os_type":"' + os.type() + '"}'
  });

  var done_val = 0;
  socket.once("LOGIN_SUCCESS", function (data) { //登录成功
    if (data.uname == uname && done_val == 0) {
      done_val = 1;
      uid = data.uid;
      vscode.window.setStatusBarMessage("你好，" + uname);
      callback(data.uid, data.token);
    }
  });

  socket.once("LOGIN_FAILED", function (data) { //登录失败
    if (data.uname == uname && done_val == 0) {
      done_val = 1;
      console.error("user validation failed!");
      vscode.window.showErrorMessage("用户验证失败，请检查用户名和密码!","没有帐户？去注册").then(function(select){
        if (select == "没有帐户？去注册")
          vscode.env.openExternal(vscode.Uri.parse(oj_url + "/user/register.php"));
      });
    }
  });
}

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  console.log(
    'Congratulations, your extension "hikari-vscode" is now active in ' +
      __dirname +
      "!"
  );

  console.log("Benchmark: " + require("./judge").time_limit_per_pt); //获取评测基准系数

  let func_submit = vscode.commands.registerCommand(
    "hikari-vscode.submit",
    function () {
      validate_user(function (uid, salt) {
        console.log("login success! uid: " + uid + " salt: " + salt);

        vscode.window
          .showInputBox({
            ignoreFocusOut: true,
            placeHolder: "题目编号", // 在输入框内的提示信息
            prompt: "输入待评测的题目编号", // 在输入框下方的提示信息
          })
          .then(function (msg) {
            if (msg) {
              if (!pid_map[msg]) {
                pid_map[msg] = true;
                socket.emit("submit", { //发送提交信息
                  uid: uid,
                  pid: msg,
                  code: vscode.window.activeTextEditor.document.getText(),
                });
                vscode.window.setStatusBarMessage("评测已提交！");
              } else {
                vscode.window.showErrorMessage("正在评测中，请耐心等待...","重置评测列表").then(function(select){
                  if (select == "重置评测列表"){
                    pid_map = {};
                  }
                });
              }
            }
          });
      });
    }
  );

  context.subscriptions.push(func_submit);
}

//评测循环
socket.on("judge_pull", function (data) { //拉取评测
  if (judge_inq[data.rid + "&" + data.grp] != "InQ"){ //不在队列中
    judge_inq[data.rid + "&" + data.grp] = "InQ";
    Queue.push(data,function(data){
      //console.log("Group:" + data.grp + ",Input:" + data.input + ",Output:" + data.output);
      //console.log("VAlid:" + data.valid_code + "," + data.valid_in);

      // @ts-ignore
      request(data.input,function (error, response, body){ //拉取评测数据
        // @ts-ignore
        data.input = body;
        // @ts-ignore
        console.log("开始评测: " + data.rid + " 测试点编号:" + data.grp + " 队列长度:" + Queue.length());
        // @ts-ignore
        // @ts-ignore
        do_compile_out(data.code, data.input,true, data.time_limit, data.mem_limit, function (status, stdout, compile_info, time_used) {
          console.log("评测完毕！结果：" + status + " 输出：" + stdout.substr(0, 100));
          socket.emit("judge_push_result", {
            // @ts-ignore
            rid: data.rid,
            // @ts-ignore
            uid: data.uid,
            // @ts-ignore
            pid: data.pid,
            // @ts-ignore
            grp: data.grp,
            // @ts-ignore
            code: data.code,
            compile_info : compile_info,
            time_used : time_used,
            status: status,
            out: md5(stdout),
          });
        });
      });
    });
  }
});

socket.on("judge_pts_done",function(data){ //单个数据点完成
  if (data.uid == uid && pid_map[data.pid] == true && data.cnt_done != data.datacnt) {
    if (data.stat == "AC"){
      vscode.window.setStatusBarMessage("题目 " +
      data.pid +
      " 第 " + data.grp + "个数据已评测(共" + data.datacnt + "个),状态：" + data.stat + "，共评测完成 " + data.cnt_done + "个数据。" );
    }else{
      vscode.window.setStatusBarMessage(
        "题目 " +
          data.pid +
          " 第 " + data.grp + "个数据已评测(共" + data.datacnt + "个),状态：" + data.stat + "，共评测完成 " + data.cnt_done + "个数据。" 
      );
    }
  }
});

socket.on("judge_all_done", function (data) { //全部数据点完成
  console.log("ALLDONE GET:" + data.uid + "," + data.pid);
  if (data.uid == uid && pid_map[data.pid] == true) {
    if (data.stat == "AC") {
      vscode.window.setStatusBarMessage("题目 " +
      data.pid +
      " 已通过,分数:" +
      Math.floor(100*data.pts/data.datacnt)
      );
      vscode.window.showInformationMessage(
        "题目 " +
          data.pid +
          " 已通过,分数:" +
          Math.floor(100*data.pts/data.datacnt),"在浏览器查看"
      ).then(function(select){
        if (select == "在浏览器查看")
          vscode.env.openExternal(vscode.Uri.parse(oj_url + "/record/?id=" + data.rid));
      });
    } else {
      vscode.window.setStatusBarMessage("题目 " +
      data.pid +
      " 未通过, 状态: " +
      data.stat +
      ", 分数: " +
      Math.floor(100*data.pts/data.datacnt));

      vscode.window.showErrorMessage(
        "题目 " +
          data.pid +
          " 未通过, 状态: " +
          data.stat +
          ", 分数: " +
          Math.floor(100*data.pts/data.datacnt),"在浏览器查看"
      ).then(function(select){
        if (select == "在浏览器查看")
          vscode.env.openExternal(vscode.Uri.parse(oj_url + "/record/list.php?pid=" + data.pid));
      });
    }

    pid_map[data.pid] = false;
  }
});

function deactivate() { //退出时清空临时目录
  var cleanPath = __dirname + "\\submissions\\";
  console.log("正在清除缓存，目录：" + cleanPath);
  delDir(cleanPath);
  fs.mkdirSync(cleanPath);
  fs.writeFileSync(cleanPath + "_gitkeep","This File is to keep this folder hosted by Git.");
  console.log("清理完成。");
}

module.exports = {
  activate,
  deactivate,
};
