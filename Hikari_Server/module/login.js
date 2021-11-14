/* 数据库 */
var ojcfg = require("./ojconfig");
var mysql = require('mysql');
/* md5加密 */
var md5 = require("md5-node");
var io = ojcfg.io;

/* 数据表user
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `Email` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `luoguUID` int(11) NOT NULL DEFAULT '1',
  `tag` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `grade` int(11) NOT NULL DEFAULT '1',
  `message` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISAM AUTO_INCREMENT=262 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
*/

function validate_userdata_mysql(uname, passwd, callback) {
  /* 返回数据JSON 数据见上 */
  var con = mysql.createConnection({
    host     : ojcfg.host,
    user     : ojcfg.user,
    password : ojcfg.password,
    database : ojcfg.database
  });

  con.connect();
  data = JSON.parse('{"code":"error","result":"用户不存在"}');
  var sql = "SELECT * FROM `user` WHERE `name` in(" + con.escape(uname) + ")";
  con.query(sql, function (err, result) {
    if (err) {
      throw err;
    }

    var len = result.length;
    if (len == 0){
      con.end();
      callback(data);
    }
    
    passwd = md5(md5(md5(passwd)));
    for (var i = 0; i < len; i++) {
      if (result[i]["name"].toLowerCase() == uname.toLowerCase()) {
        if (result[i]["password"] == passwd) {
          data["code"] = "success";
          data["result"] = result[i];
          break;
        } else {
          console.log("[login.js] Password Missmatch! (" + result[i]["password"] + ',' + passwd + ")");
          data = JSON.parse('{"code":"error","result":"密码错误"}');
        }
      }
    }

    callback(data);
  });
}

/**
 * 验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname
 * @param {string} passwd
 * @param {Function} callback
 */

 function validate_user(token, uname, passwd, callback) {
  validate_userdata_mysql(uname, passwd, function (data) {
    if (data["code"] == "success") {
      io.emit("LOGIN_SUCCESS", {
        uid: data["result"]["id"],
        uname: uname,
        token: token,
      });
      callback(data["result"]["id"], uname, passwd,data["result"]["grade"]);
    } else {
      io.emit("LOGIN_FAILED", {
        uid: -1,
        uname: uname,
        token: token,
      });
      console.log("[login.js] valid Failed.");
    }
  });
}

module.exports = {
  validate_user,
};
