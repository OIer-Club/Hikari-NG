const async = require("async");
/**
 *队列
 * @param obj ：obj对象 包含执行时间
 * @param callback ：回调函数
 */
const Queue = async.queue(function (obj, callback) {
  console.log("已压入评测队列: " + obj.rid + " 测试点编号:" + obj.grp);
  callback(obj);
}, 1);
module.exports = Queue;