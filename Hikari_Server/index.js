const server = require('http').createServer();
const io = require('socket.io')(server);

//socket连接列表
var connectionList = {};

/**
 * (待完善）验证用户信息时否正确。
 * @param {*} socket
 * @param {string} uname 
 * @param {string} passwd 
 * @param {Function} callback 
 */
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