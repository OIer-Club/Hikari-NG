<?php
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libconfig.php");
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libapi.php");

function ui_header($title){
    echo '<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <title>' . $title . '</title>
      <link rel="stylesheet" href="./layui/css/layui.css">
    </head>
    <body>';

    //侧边导航栏
    echo '<ul class="layui-nav layui-nav-tree layui-nav-side" lay-filter="test">
    <!-- 侧边导航: <ul class="layui-nav layui-nav-tree layui-nav-side"> -->
      <li class="layui-nav-item layui-nav-itemed">
      <a href="/index.php">首页</a></li>
      <li class="layui-nav-item layui-nav-itemed">
        <a href="javascript:;">题库</a>
        <dl class="layui-nav-child">
          <dd><a href="/problem/index.php">列表</a></dd>
          <dd><a href="/problem/search.php">搜索</a></dd>
          <dd><a href="/problem/random.php">随机跳题</a></dd>
        </dl>
      </li>
      <li class="layui-nav-item"><a href="/recordshow.php">记录</a></li>
      <li class="layui-nav-item">
        <a href="javascript:;">应用</a>
        <dl class="layui-nav-child">
          <dd><a href="/ide.php">在线IDE</a></dd>
        </dl>
      </li>
      <li class="layui-nav-item">
        <a href="javascript:;">' . (uid == -1?"用户":post_msg("userdata",array("uid"=>uid))["uname"]) . '</a>
        <dl class="layui-nav-child">
          <dd><a href="">编辑信息</a></dd>
          <dd><a href="">私信</a></dd>
          <dd><a href="">退出登录</a></dd>
        </dl>
      </li>
      <li class="layui-nav-item"><a href="/exit.php">退出</a></li>
    </ul>';

    //初始化Container
    echo "<div class=\"layui-body\"> ";
}

function ui_footer(){
    echo "</div>";
    echo '<script src="./layui/layui.js"></script>
    </body>
    </html>';
}