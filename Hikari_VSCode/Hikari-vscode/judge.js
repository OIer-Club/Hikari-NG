var exec = require("child_process").exec;
var execSync = require("child_process").execSync;

const stringRandom = require("string-random");
const fs = require("fs");

var time_limit_per_pt = 1000;
var time_limit_compile = 7000;

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
  var r_d_id = stringRandom(16);
  var working_directory = __dirname + "\\submissions\\" + r_d_id;
  var code_file = working_directory + "\\code" + r_d_id + ".cpp";
  var elf_file = working_directory + "\\code" + r_d_id + ".exe";
  var compile_command = __dirname + "\\MinGW64\\bin\\g++.exe -std=c++14 " + code_file + " -o " + elf_file;
  var judge_command = elf_file +" < " + working_directory +"\\data.in > " + working_directory + "\\data.out";

  fs.mkdir(working_directory, function (err) {
    if (err) return console.error(err);

    fs.writeFileSync(code_file, code);
    exec(
      compile_command,
      { timeout: time_limit_compile },
      function (error, _stdout, _stderr) {
        if (error) {
          console.error(error);
          console.log(_stdout, _stderr);
          callback("CE", _stderr);
        } else {
          console.log("compiled with info: " + _stdout);
          fs.writeFileSync(working_directory + "\\data.in", stdin);
          exec(
            judge_command,
            { timeout: time_limit_per_pt },
            function (error, _stdout, _stderr) {
              if (error) {
                var ret = execSync("chcp 437 & taskkill /f /im " + "code" + r_d_id + ".exe");
                //console.log("Timeout!");
                if (ret.indexOf("SUCCESS") > 0){
                  callback("TLE", stdout);
                }else{
                  callback("RE", stdout);
                }
                
                //console.error(error);
                console.log(_stdout, _stderr);
              } else {
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
              }
            }
          );
        }
      }
    );
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
