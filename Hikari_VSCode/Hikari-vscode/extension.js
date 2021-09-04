// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//OJ配置，请自行修改
const vscode = require("vscode");
var oj_url = vscode.workspace.getConfiguration().get("hikari-vscode.oj_url"); // OJ的网址
var uname = vscode.workspace.getConfiguration().get("hikari-vscode.uname");
var passwd = vscode.workspace.getConfiguration().get("hikari-vscode.passwd");

console.log("OJ URL:" + oj_url);
var uname,
  passwd,
  uid = -1;
var pid_map = {};

const do_judge = require("./judge").do_judge;
const do_compile_out = require("./judge").do_compile_out;

const io = require("socket.io-client");
// @ts-ignore
const socket = io(oj_url + ":1919");
//const child_process = require("child_process");
 
/**
 *
 * @param {function} callback
 */
function validate_user(callback) {
  socket.emit("login", {
    username: uname,
    password: passwd,
  });

  var done_val = 0;
  socket.once("LOGIN_SUCCESS", function (data) {
    if (data.uname == uname && done_val == 0) {
      done_val = 1;
      uid = data.uid;
      vscode.window.setStatusBarMessage("你好，" + uname);
      callback(data.uid, data.token);
    }
  });

  socket.once("LOGIN_FAILED", function (data) {
    if (data.uname == uname && done_val == 0) {
      done_val = 1;
      console.error("user validation failed!");
      vscode.window.showErrorMessage("User Validation Failed!");
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
  console.log("Benchmark: " + require("./judge").time_limit_per_pt);

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
                socket.emit("submit", {
                  uid: uid,
                  pid: msg,
                  code: vscode.window.activeTextEditor.document.getText(),
                });
              } else {
                vscode.window.showErrorMessage("正在评测中，请耐心等待...");
              }
            }
          });
      });
    }
  );

  context.subscriptions.push(func_submit);
}

//评测循环
socket.on("judge_pull", function (data) {
  //console.log("Input:" + data.input + ",Output:" + data.output);
  //console.log("VAlid:" + data.valid_code + "," + data.valid_in);

  do_compile_out(data.valid_code,data.valid_in,false,0,0,function(_val_status,_val_out){
    //console.log("Valid Out:" + _val_out);
    do_judge(data.code, data.input, data.output, data.time_limit,data.mem_limit,function (status, stdout) {
      console.log("评测完毕！结果：" + status + " 输出：" + stdout);
      socket.emit("judge_push_result", {
        rid: data.rid,
        uid: data.uid,
        pid: data.pid,
        grp: data.grp,
        code: data.code,
        status: status,
        pts: status == "AC" ? 1 : 0,
        in : data.input,
        out: stdout,
        valid_out : _val_out
      });
    });
  });
});

socket.on("judge_all_done", function (data) {
  //console.log("ALLDONE GET:" + data.uid + "," + data.pid);
  if (data.uid == uid && pid_map[data.pid] == true) {
    if (data.stat == "AC") {
      vscode.window.showInformationMessage(
        "Problem " +
          data.pid +
          " Accepted,Score:" +
          Math.floor(100*data.pts/data.datacnt)
      );
    } else {
      vscode.window.showErrorMessage(
        "Problem " +
          data.pid +
          " Unaccepted, Status: " +
          data.stat +
          ", Score: " +
          Math.floor(100*data.pts/data.datacnt)
      );
    }

    pid_map[data.pid] = false;
  }
});

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
