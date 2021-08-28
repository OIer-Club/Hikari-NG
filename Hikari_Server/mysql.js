var mysql = require('mysql');

var host = 'localhost';
var user = 'Hikari';
var password = '??????';
var database = 'Hikari';

var con = mysql.createConnection({
  host     : host,
  user     : user,
  password : password,
  database : database
});
