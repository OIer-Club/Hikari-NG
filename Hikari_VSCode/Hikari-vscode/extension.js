// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//OJ配置，请自行修改
var oj_url = "http://127.0.0.1"; // OJ的网址
var uname, passwd;

const judge = require("./judge").do_judge;
const io = require("socket.io-client");
const socket = io(oj_url + ":1919");
const vscode = require("vscode");
const fs = require("fs");
//const child_process = require("child_process");
const user_file = __dirname + "/user.json";

/**
 *
 * @param {string} filePath
 */
function openLocalFile(filePath) {
  // 获取TextDocument对象
  vscode.workspace
    .openTextDocument(filePath)
    .then(
      (doc) => {
        // 在VSCode编辑窗口展示读取到的文本
        vscode.window.showTextDocument(doc);
      },
      (err) => {
        console.log(`Open ${filePath} error, ${err}.`);
      }
    )
    .then(undefined, (err) => {
      console.log(`Open ${filePath} error, ${err}.`);
    });
}

/**
 *
 * @param {function} callback
 */
function validate_user(callback) {
  try {
    fs.accessSync(user_file, fs.constants.R_OK | fs.constants.W_OK);
    var data = fs.readFileSync(user_file).toString();
    JSON.parse(data, function (key, value) {
      if (key == "uname") uname = value;
      if (key == "passwd") passwd = value;
    });

    socket.emit("login", {
      username: uname,
      password: passwd,
    });

    var done_val = 0;
    socket.once("LOGIN_SUCCESS", function (data) {
      if (data.uname == uname && done_val == 0) {
        done_val = 1;
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
  } catch (err) {
    console.error("user.json Not Found!");
    vscode.window.showErrorMessage("Please Login First!");
  }
}

//已弃用。
/* function start_judger(){
  console.log("Starting Judger...");
  var workerProcess = child_process.exec(
    "node " + __dirname + "/judge.js",
    function (error, stdout, stderr) {
      if (error) {
        console.log(error.stack);
        console.log(stderr + "Error code: " + error.code);
        console.log("Signal received: " + error.signal);
      }
      console.log(stdout);
    }
  );

  workerProcess.on("exit", function (code) {
    console.log("Judger Exited with Code :" + code);
  });
} */

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  console.log(
    'Congratulations, your extension "hikari-vscode" is now active in ' +
      __dirname +
      "!"
  );

  //开启评测进程
  //start_judger();

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
            socket.emit("submit", {
              uid: uid,
              pid: msg,
              code: vscode.window.activeTextEditor.document.getText(),
            });
          });
      });
    }
  );

  let func_login = vscode.commands.registerCommand(
    "hikari-vscode.login",
    function () {
      try {
        fs.accessSync(user_file, fs.constants.R_OK | fs.constants.W_OK);
      } catch (err) {
        console.error("Creating user.json");
        fs.writeFileSync(
          user_file,
          '{"uname":"Your Username Here","passwd":"Your Password Here"}'
        );
      }
      openLocalFile(user_file);
    }
  );

  context.subscriptions.push(func_submit);
  context.subscriptions.push(func_login);

  //评测循环
  socket.on("judge_pull", function (data) {
    //console.log(data.rid,data.grp,data.code,data.input,data.output);
    judge(data.code, data.input, data.output, function (status, stdout) {
      console.log("评测完毕！结果：" + status + " 输出：" + stdout);
      socket.emit("judge_push_result", {
        rid: data.rid,
        pid: data.pid,
        grp: data.grp,
        status: status,
        pts: status == "AC" ? 10 : 0,
        out: stdout,
      });
    });
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
