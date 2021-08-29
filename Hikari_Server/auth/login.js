/* 数据库 */
var mysql = require('../module/mysql');
/* md5加密 */
var md5 = require('../module/md5');

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

function userdata(uname,passwd,callback) { /* 返回数据JSON 数据见上 */
  mysql.con.connect();
  data = JSON.parse('{"code":"error","result":"用户不存在"}');
  var sql = 'SELECT * FROM `user`';
  connection.query(sql,function (err, result) {
    if(err){
      data = JSON.parse('{"code":"error","result":"'+err.message+'"}');
      return data;
    }
    result=JSON.stringify(result);
    var len = result.length;
    passwd = md5.hex_md5(md5.hex_md5(md5.hex_md5(passwd)))
    for(var i = 0; i < len; i++) {
      if(result[i]['name']==uname) {
        if(result[i]['password']==passwd) {
          data = JSON.parse('{"code":"ok"}');
          data["result"] = result[i];
          break;
        } else {
          data = JSON.parse('{"code":"error","result":"密码错误"}');
        }
      }
    }
  });
  mysql.con.end();
  callback(data);
}
