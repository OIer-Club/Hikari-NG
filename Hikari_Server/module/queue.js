const async = require("async");
/**
 *队列
 * @param obj ：obj对象 包含执行时间
 * @param callback ：回调函数
 */
const Queue = async.queue(function (obj, callback) {
  console.log("[queue.js] task running... " + obj.rid);
  callback(obj.uid, obj.pid, obj.code);
}, 1);

// worker数量将用完时，会调用saturated函数
Queue.saturated = function () {
  console.log("[queue.js] all workers to be used");
};

// 当最后一个任务交给worker执行时，会调用empty函数
Queue.empty = function () {
  console.log("[queue.js] no more tasks wating");
};

// 当所有任务都执行完时，会调用drain函数
Queue.drain = function () {
  console.log("[queue.js] all tasks have been processed");
};
module.exports = Queue;
