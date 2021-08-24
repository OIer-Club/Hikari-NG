<?php
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libconfig.php");

/**
 * 发送post请求
 * @param string $url 请求地址
 * @param array $post_data post键值对数据
 * @return string
 * Usage: $post_data = send_post('https://www.example.com', array('username' => '123','password' => '456'));
 */
function send_post($url, $post_data) {
 
    $postdata = http_build_query($post_data);
    $options = array(
      'http' => array(
        'method' => 'POST',
        'header' => 'Content-type:application/x-www-form-urlencoded',
        'content' => $postdata,
        'timeout' => 15 * 60 // 超时时间（单位:s）
      )
    );
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
   
    return $result;
  }
   
function api_url($api_name){
    return oj_url . "/api/" . $api_name . ".php";
}

function post_msg($api_name,$arr_pst){
  return json_decode(send_post(api_url($api_name),$arr_pst),true);
}