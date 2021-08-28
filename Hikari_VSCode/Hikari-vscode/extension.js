// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//OJ配置，请自行修改
var oj_url = "http://127.0.0.1"; // OJ的网址
var uname, passwd;

const vscode = require("vscode");
const fs = require("fs");
const io = require("socket.io-client");
const socket = io(oj_url + ":1919");
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

    socket.on("LOGIN_SUCCESS", function (data) {
      if (data.uname == uname) {
        vscode.window.setStatusBarMessage("你好，" + uname);
        callback(data.uid, data.token);
      }
    });

    socket.on("LOGIN_FAILED", function (data) {
      if (data.uname == uname) {
        console.error("user validation failed!");
        vscode.window.showErrorMessage("User Validation Failed!");
      }
    });
  } catch (err) {
    console.error("user.json Not Found!");
    vscode.window.showErrorMessage("Please Login First!");
  }
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

  let func_submit = vscode.commands.registerCommand(
    "hikari-vscode.submit",
    function () {
      validate_user(function (uid, salt) {
        console.log("login success! uid: " + uid + " salt: " + salt);
        vscode.window.showInformationMessage(
          vscode.window.activeTextEditor.document.getText()
        );
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
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
