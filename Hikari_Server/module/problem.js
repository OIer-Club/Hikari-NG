var ojcfg = require("./ojconfig");

var mysql = require("mysql");
var request = require('sync-request');

function stringToBase64(str){
    var base64Str = new Buffer.from(str).toString('base64');
    return base64Str;
}

/**
 * 获取一组数据
 * @param {integer} pid : 题目编号
 * @param {integer} grp_id : 第几组数据
 * @returns :该组数据的输入输出
 */

function get_problem_data(socketId, pid, grp_id, callback) {
  var con = mysql.createConnection({
    host: ojcfg.host,
    user: ojcfg.user,
    password: ojcfg.password,
    database: ojcfg.database,
  });
  con.connect();
  var sql = "SELECT * FROM `problem` WHERE id in(" + con.escape(pid) + ")";

  con.query(sql, function (err, result) {
    if (err) {
      return data;
    }

    //var len = result.length;
    //console.log("Len: " + len);
    if (result.length == 0){
        callback(-1);
    }else if (result[0]["hidden"] != 0 && ojcfg.connectionList[socketId].grade < 5){
        callback(-1);
    }else{
        
    
        con.end();
        if (grp_id == -1) {
            a_size = JSON.parse(request('GET',ojcfg.choose_data_server() + "/?action=size&pid=" + pid).getBody());
            if (a_size.status == "503")
                callback(-1);
            else
                callback(a_size.size);
        } else {
            a_url = JSON.parse(request('GET', ojcfg.choose_data_server() + "/?action=allocate&pid=" + pid + "&grp=" + grp_id).getBody());
          callback(
            {
              input: a_url.url_in,
              output: a_url.url_out,
            },
            grp_id
          );
        }
    }
  });
}

/**
 * 获取时空限制
 * @param {integer} pid : 题目编号
 * @returns :该组数据的输入输出
 */

function get_problem_limits(pid, callback) {
  var con = mysql.createConnection({
    host: ojcfg.host,
    user: ojcfg.user,
    password: ojcfg.password,
    database: ojcfg.database,
  });
  con.connect();
  var sql = "SELECT * FROM `problem` WHERE id in(" + con.escape(pid) + ")";

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

module.exports = {
    stringToBase64,get_problem_data,get_problem_limits
}