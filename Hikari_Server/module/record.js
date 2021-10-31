var ojcfg = require("./ojconfig");
const problem = require("./problem");

var mysql = require("mysql");

function update_user_rank(uid,stat,pid){
  var con = mysql.createConnection({
    host: ojcfg.host,
    user: ojcfg.user,
    password: ojcfg.password,
    database: ojcfg.database,
  });
  con.connect();

  var sql = "SELECT * FROM `statistics` WHERE id in(" + con.escape(uid) + ")";
  con.query(sql,function(err,result){
    if (err){
      console.error(err);
    }

    if (result.length == 0){
      sql = "INSERT INTO `statistics` VALUE(" + uid + ",0,0,'[]',1000)";
      con.query(sql);
    }

    var al_ex = false;
    JSON.parse(result[0]["ac_detail"],function(key,value){
      if (value == pid) al_ex = true;
    });

    sql = "UPDATE `statistics` SET tot_submit = tot_submit+1" + 
    ((stat == "AC" && al_ex == false)? ",tot_ac = tot_ac + 1,rank = rank + 3,ac_detail=json_array_append(ac_detail,'$'," + con.escape(pid) + ")" : "") +
     " where `id` = " + uid;

    con.query(sql,function(err,result){
      if (err){
        console.error(err);
      }

      con.end();
    });
  });
}
/**
 * 将评测记录保存至数据库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_db(rid, pid, uid, code, stat, pts, detail) {
  update_user_rank(uid,stat,pid);
  var con = mysql.createConnection({
    host: ojcfg.host,
    user: ojcfg.user,
    password: ojcfg.password,
    database: ojcfg.database,
  });
  con.connect();
  var sql =
    "INSERT INTO `record` (rid,pid,uid,code,stat,pts,detail) VALUES (?,?,?,?,?,?,?)";

  con.query(
    sql,
    [rid, pid, uid, code, stat, pts, problem.stringToBase64(detail)],
    function (err) {
      if (err) {
        console.error(err);
      }
      con.end();
    }
  );
}

module.exports = {
    save_result_to_db
}