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

/**
 * 将评测记录保存至Valid库
 * @param {integer} rid : 待保存的rid
 */
function save_result_to_valid(rid, code, pid, grp) {
  problem.get_problem_data(pid, grp, function (data, grp_id) {
    var con = mysql.createConnection({
      host: ojcfg.host,
      user: ojcfg.user,
      password: ojcfg.password,
      database: ojcfg.database,
    });
    con.connect();
    var sql =
      "INSERT INTO `reliable_judge` (rid,code,input,output) VALUES (?,?,?,?)";

    con.query(sql, [rid, code, data.input, data.output], function (err) {
      if (err) {
        console.error(err);
      }
      con.end();
    });
  });
}

/**
 * 生成验证代码和数据
 * @param {function} callback : 回调函数
 */
function generate_validate_code(callback) {
  var con = mysql.createConnection({
    host: ojcfg.host,
    user: ojcfg.user,
    password: ojcfg.password,
    database: ojcfg.database,
  });
  con.connect();
  var sql =
    "SELECT * FROM  reliable_judge WHERE id >= ((SELECT MAX(id) FROM reliable_judge)-(SELECT" +
    "      MIN(id) FROM reliable_judge)) * RAND() + (SELECT MIN(id) FROM reliable_judge) LIMIT 1";

  con.query(sql, function (err, result) {
    if (err) {
      return data;
    }
    con.end();

    callback({
      code: result[0]["code"],
      input: result[0]["input"],
      output: result[0]["output"],
    });
  });
}

module.exports = {
    save_result_to_db,save_result_to_valid,generate_validate_code
}