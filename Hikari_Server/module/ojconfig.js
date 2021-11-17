var host = 'localhost';
var user = 'hikari';
var password = 'Z4E4zxFafyH6nJr4';
var database = 'hikari';

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

/*数据表problem
CREATE TABLE `problem` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `provider` int(11) NOT NULL,
  `time` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  `tag` varchar(100) NOT NULL,
  `gescription` longtext NOT NULL,
  `input` longtext NOT NULL,
  `output` longtext NOT NULL,
  `sample` longtext NOT NULL,
  `hint` longtext NOT NULL,
  `data` longtext NOT NULL,
  `hidden` int(11) NOT NULL DEFAULT '0',
  `time_limit` int(11) NOT NULL,
  `mem_limit` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8
*/

/*评测记录数据库record
CREATE TABLE `hikari`.`record` ( 
  `id` INT AUTO_INCREMENT NOT NULL ,
  `rid` BIGINT NOT NULL , 
  `pid` INT NOT NULL ,
  `uid` INT NOT NULL , 
  `code` LONGTEXT NOT NULL ,
  `stat` VARCHAR(30) NOT NULL ,
  `pts` INT NOT NULL , 
  `detail` LONGTEXT NOT NULL , 
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;
*/

/*评测验证数据库reliable_judge
CREATE TABLE `hikari`.`reliable_judge` (
	`id` INT NOT NULL AUTO_INCREMENT,
   `rid` BIGINT(20) NOT NULL, 
	`code` LONGTEXT NOT NULL,
	`input` LONGTEXT NOT NULL,
	`output` LONGTEXT NOT NULL,
	PRIMARY KEY (`id`),
	UNIQUE (`rid`)
) ENGINE = InnoDB;
*/

/*用户记录数据库
CREATE TABLE `hikari`.`statistics` ( 
`id` INT NOT NULL , 
`tot_submit` INT NOT NULL DEFAULT '0' , 
`tot_ac` INT NOT NULL DEFAULT '0' , 
`ac_detail` LONGTEXT ,
`rank` INT NOT NULL DEFAULT '1000' , 
PRIMARY KEY (`id`)) ENGINE = InnoDB;
*/

//socket连接列表
var connectionList = {};
var result_list = {};

//队列中的评测数
var cntInQueue = 0;
//登陆的用户数
var userLoggedin = 0;

const server = require("http").createServer(function (request, response) {
  response.writeHead(200, { "Content-Type": "text/json" });
  var comma = false;
  if (request.url.startsWith('/judgers')){
    resp = '[';
    for (var index in connectionList){
        if (typeof(connectionList[index].info) != "undefined"){
            if (!comma) comma = true; else resp += ',';
            resp += connectionList[index].info;
        }
    }
    resp += ']';
    response.end(resp);
  }else{
    response.end('{"status":"200","online":"' + io.engine.clientsCount + '","inqueue":"0"}\n');
  }
});

const io = require("socket.io")(server);
const fs = require("fs");
var request = require('sync-request');

const data_servers = JSON.parse(fs.readFileSync("../../front-end/data-server.json"));
function choose_data_server(){
    for (i=0;i<data_servers.length;i+=1){
        var t = request('GET', data_servers[i]).getBody();
        if (t == '{"status":"200"}'){
            return data_servers[i];
        }
    }
}

module.exports = {
  host,user,password,database,
  cntInQueue,userLoggedin,server,io,
  connectionList,result_list,data_servers,
  choose_data_server
};
