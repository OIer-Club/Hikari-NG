var exec = require("child_process").exec;
const stringRandom = require("string-random");
const fs = require("fs");

/**
 *
 * @param {string} cmd ：命令
 * @param {Function} callback ：回调函数
 */
function execute(cmd, callback) {
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.error(error);
      console.log(stdout, stderr);
    } else {
      console.log(cmd + " success");
      callback(stdout);
    }
  });
}

/**
 *
 * @param {string} code :待评测代码
 * @param {string} stdin ：输入
 * @param {string} stdans ：答案
 * @param {Function} callback ：回调函数
 */
function do_judge(code, stdin, stdans, callback) {
  var working_directory = __dirname + "\\submissions\\" + stringRandom(16);
  var compile_command =
    __dirname +
    "\\MinGW64\\bin\\g++.exe " +
    working_directory +
    "\\code.cpp" +
    " -o " +
    working_directory +
    "\\code.exe";
  var judge_command =
    working_directory +
    "\\code.exe < " +
    working_directory +
    "\\data.in > " +
    working_directory +
    "\\data.out";
  fs.mkdir(working_directory, function (err) {
    if (err) return console.error(err);

    fs.writeFileSync(working_directory + "\\code.cpp", code);
    exec(compile_command, function (error, _stdout, _stderr) {
      if (error) {
        console.error(error);
        console.log(_stdout, _stderr);
        callback("CE", _stderr);
      } else {
        console.log("compiled with info: " + _stdout);
        fs.writeFileSync(working_directory + "\\data.in", stdin);
        execute(judge_command, function (_stdout) {
          console.log("judged with info:" + _stdout);
          var stdout = fs
            .readFileSync(working_directory + "\\data.out")
            .toString()
            .replace(/\s*/g, "")
            .replace(/[\r\n]/g, "")
            .replace(/[\n]/g, "");
          stdans = stdans
            .replace(/\s*/g, "")
            .replace(/[\r\n]/g, "")
            .replace(/[\n]/g, "");

          if (stdout == stdans) {
            console.log("Accepted!");
            callback("AC", stdout);
          } else {
            console.log("Wrong Answer.");
            console.log("'" + stdans + "','" + stdout + "'");
            callback("WA", stdout);
          }
        });
      }
    });
  });
}

/*
do_judge(
  "#include<bits/stdc++.h>\nusing namespace std;\nint main(){int a,b;cin>>a>>b;cout<<a+b<<endl;return 0;}",
  "1 2",
  "3",
  function(status,stdout){
      console.log("评测完毕！结果：" + status + " 输出：" + stdout);
  }
);
*/

module.exports = {
  do_judge,
};
