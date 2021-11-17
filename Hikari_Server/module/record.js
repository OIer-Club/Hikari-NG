var ojcfg = require("./ojconfig");
const problem = require("./problem");

var mysql = require("mysql");
var io = ojcfg.io;

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

function tackle_pts_done(data){
  if (ojcfg.result_list.hasOwnProperty(data.rid) && !ojcfg.result_list[data.rid].all_done) { //没有全部评测完成
    if (!ojcfg.result_list[data.rid].grp_rec[data.grp].exist || ojcfg.result_list[data.rid].grp_rec[data.grp].pts != 1) { //该评测点尚未评测完成，或未AC（防止恶意结果）
      ojcfg.result_list[data.rid].grp_rec[data.grp].time_used = Date.now() - ojcfg.result_list[data.rid].grp_rec[data.grp].timestamp;
      
      var is_ac = (data.out == ojcfg.result_list[data.rid].grp_rec[data.grp].db_out);
      console.log("[index.js] Result Get! RID:" + data.rid + ",data.grp:" + data.grp);
      ojcfg.result_list[data.rid].cnt += 1;
      ojcfg.result_list[data.rid].grp_rec[data.grp].exist = true;
      ojcfg.result_list[data.rid].grp_rec[data.grp].compile_info = data.compile_info;
      ojcfg.result_list[data.rid].grp_rec[data.grp].time_used = data.time_used;
      ojcfg.result_list[data.rid].grp_rec[data.grp].status = (data.status!="OK"?data.status:(is_ac?"AC":"WA"));
      ojcfg.result_list[data.rid].grp_rec[data.grp].pts = (is_ac?1:0);
      ojcfg.result_list[data.rid].grp_rec[data.grp].out = data.out;
      ojcfg.result_list[data.rid].pts += (is_ac?1:0);

      problem.get_problem_data(ojcfg.result_list[data.rid].socketId, data.pid, -1, function (datacnt) {
        io.emit("judge_pts_done", {//单个测试点完成
          rid: data.rid,
          uid: data.uid,
          pid: data.pid,
          grp: data.grp,
          pts: (is_ac?1:0),
          cnt_done: ojcfg.result_list[data.rid].cnt,
          datacnt: datacnt,
          stat: ojcfg.result_list[data.rid].grp_rec[data.grp].status,
        });
        if (ojcfg.result_list[data.rid].cnt >= datacnt && !ojcfg.result_list[data.rid].all_done) { //全部测试点完成
          console.log("[index.js] Judge All Done!" + data.rid);
          ojcfg.cntInQueue -= 1;
          
          //判断该评测的结果，取第一个非AC状态。
          ojcfg.result_list[data.rid].stat = "AC";
          for (i = 1; i <= datacnt; i += 1) {
            if (ojcfg.result_list[data.rid].grp_rec[i].status != "AC") {
              ojcfg.result_list[data.rid].stat =
                ojcfg.result_list[data.rid].grp_rec[i].status;
              break;
            }
          }
          
          //打标记
          ojcfg.result_list[data.rid].all_done = true;
          
          //删除冗余项
          delete ojcfg.result_list[data.rid].rid;
          delete ojcfg.result_list[data.rid].uid;
          delete ojcfg.result_list[data.rid].pid;
          delete ojcfg.result_list[data.rid].socketId;
          delete ojcfg.result_list[data.rid].tot_grp;
          delete ojcfg.result_list[data.rid].timestamp;
          
          for (i = 1; i <= datacnt; i += 1) {
            delete ojcfg.result_list[data.rid].grp_rec[i].timestamp;
            delete ojcfg.result_list[data.rid].grp_rec[i].exist;
            delete ojcfg.result_list[data.rid].grp_rec[i].time_limit;
            delete ojcfg.result_list[data.rid].grp_rec[i].mem_limit;
            delete ojcfg.result_list[data.rid].grp_rec[i].db_out;
          }
          
          //保存至数据库
          save_result_to_db(
            data.rid,
            data.pid,
            data.uid,
            ojcfg.result_list[data.rid].code,
            ojcfg.result_list[data.rid].stat,
            ojcfg.result_list[data.rid].pts,
            JSON.stringify(ojcfg.result_list[data.rid].grp_rec)
          );

          io.emit("judge_all_done", {//发送全部完成消息
            rid: data.rid,
            uid: data.uid,
            pid: data.pid,
            pts: ojcfg.result_list[data.rid].pts,
            datacnt: datacnt,
            stat: ojcfg.result_list[data.rid].stat,
          });
        } else {
          console.log(
            "[index.js] Judge " +
              data.rid +
              ": " +
              ojcfg.result_list[data.rid].cnt +
              " Out of " +
              datacnt
          );
        }
      });
    }
  } else {
    //console.log("[index.js] " + ojcfg.result_list[data.rid].grp_rec[data.grp]);
    console.log("[index.js] User " + data.uid + "'s result has been rejected.");
  }
}
module.exports = {
    save_result_to_db,
    tackle_pts_done
}