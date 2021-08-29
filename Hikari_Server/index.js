const server = require('http').createServer();
const io = require('socket.io')(server);

/* 数据库 */
var mysql = require('./mysql');
/* md5加密 */
var md5 = require('./md5');

//socket连接列表
var connectionList = {};

/**
 * (待完善）验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname 
 * @param {string} passwd 
 * @param {Function} callback 
 */

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

function userdata(uname,passwd) { /* 返回数据JSON 数据见上 */
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
  return data;
}

function validate_user(socket,token,uname,passwd,callback){
    if (uname != null && passwd != null){
        socket.emit("LOGIN_SUCCESS",{
            uid : 114514, /*（待完善）从数据库获取的UID */
            uname : uname,
            token : token
        });
        callback(uname,passwd);
    }else{
        socket.emit("LOGIN_FAILED",{
            uid : 114514, /*（待完善）从数据库获取的UID */
            uname : uname,
            token : token
        });
        console.log("valid Failed.");
    }
}


/*
* socket主进程
*/
io.sockets.on("connection", function (socket) {
  //客户端连接时，保存socketId和用户名
  var socketId = socket.id;
  console.log(socketId + " Connection Established.");
  connectionList[socketId] = {
    socket: socket,
    token: socketId,//十六位Token
  };

  //用户登录事件
  socket.on("login", function (data) {
    validate_user(socket,socketId,data.username,data.password,function(uname,passwd){
        connectionList[socketId].username = uname;
        connectionList[socketId].password = passwd;
        console.log(data.username + " logged in.");
    })
  });

  //用户离开
  socket.on("disconnect", function () {
    delete connectionList[socketId];
  });

});
server.listen(1919);
console.log("Server listening on port 1919.");
