const server = require("http").createServer();
const io = require("socket.io")(server);
var login = require("./auth/login");
var md5 = require("md5-node");

//socket连接列表
var connectionList = {};

/**
 * (待完善）验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname
 * @param {string} passwd
 * @param {Function} callback
 */

function validate_user(socket, token, uname, passwd, callback) {
  login.validate_userdata_mysql(uname, md5(md5(md5(passwd))), function (data) {
    if (data["code"] == "success") {
      socket.emit("LOGIN_SUCCESS", {
        uid: data["result"]["id"],
        uname: uname,
        token: token,
      });
      callback(data["result"]["id"],uname, passwd);
    } else {
      socket.emit("LOGIN_FAILED", {
        uid: -1,
        uname: uname,
        token: token,
      });
      console.log("valid Failed.");
    }
  });
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
    token: socketId, //十六位Token
  };

  //用户登录事件
  socket.on("login", function (data) {
    validate_user(
      socket,
      socketId,
      data.username,
      data.password,
      function (uid, uname, passwd) {
        connectionList[socketId].uid = uid;
        connectionList[socketId].username = uname;
        connectionList[socketId].password = passwd;
        console.log(data.username + " logged in.");
      }
    );
  });

  //用户离开
  socket.on("disconnect", function () {
    console.log(data.username + " logged out.");
    delete connectionList[socketId];
  });
});
server.listen(1919);
console.log("Server listening on port 1919.");
