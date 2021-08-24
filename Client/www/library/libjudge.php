<?php
define('JDGROOT',str_replace('\\','/',realpath(dirname(__FILE__).'/'))."/");

//---------------------------Record Oprates----------------------------------
function detect_rid(){
    $crid = 1;
    while (file_exists("record/content/R" . $crid . ".json")) $crid  = $crid+1;
    return "R" . $crid;
}

function get_rec_info($rid,$sel){
    $file = fopen(JDGROOT . "../record/content/" . (string)($rid) . ".json","r");
    $attr = fgets($file);
    fclose($file);
    $pinfo = json_decode($attr,true);
    return $pinfo[$sel];
}

function get_rec_info_all($rid){
    $file = fopen(JDGROOT . "../record/content/" . (string)($rid) . ".json","r");
    $attr = fgets($file);
    fclose($file);
    return json_decode($attr,true);
}

function set_rec_info($rid,$sel,$val){
    $pinfo = get_rec_info_all($rid);
    $pinfo[$sel] = $val;
    $file = fopen(JDGROOT . "../record/content/" . (string)($rid) . ".json","w+");
    fwrite($file,json_encode($pinfo));
    fclose($file);
}

function push_detail($rid,$sta){
    $pinfo = json_decode(get_rec_info($rid,"detail"),true);
    array_push($pinfo,$sta);
    set_rec_info($rid,"detail",json_encode($pinfo));
}

function get_detail($rid){
    return json_decode(get_rec_info($rid,"detail"),true);
}

function create_rec($uid,$pid,$code){
    $rid = detect_rid();
    $file = fopen(JDGROOT . "../record/content/" . (string)($rid) . ".json","w+");
    $pinfo = array("uid"=>$uid,"pid"=>$pid,"code"=>$code,"stat"=>"Accepted","score"=>"0","detail"=>"{}");
    fwrite($file,json_encode($pinfo));
    fclose($file);
    return $rid;
}
//---------------------------------------------------------------------------

function judge($code,$path,$t_l,$j_path){
  unlink ($j_path . "/data.in");
  if (!is_file($path)) exit("Bad Problem ID!");
  copy($path,$j_path . "/data.in");
  unlink ($j_path . "/data.out");
  
  $return_var = 0;
  system("timeout " . (string)($t_l) . " " . $j_path . "/judge < " . $j_path ."/data.in > " . $j_path . "/data.out",$return_var);
  if ($return_var == 124) return 0; else return 1;
}

function Result($code,$pid){
	$rid = create_rec(cookie_uid(),$pid,htmlentities($code));
	//print_r(get_rec_info_all($rid));
	//exit("");
	$j_path = "temp/submissions/" . $rid;
    mkdir($j_path);
    
	$file = fopen($j_path . "/judge.cpp","w+") or exit("Unable to Open CPP.");
	fwrite($file,$code);
    fclose($file);
    
	exec("timeout 7 g++ "  . $j_path . "/judge.cpp -std=c++11 -O2 -o " . $j_path . "/judge",$cot);

	if (!file_exists($j_path . "/judge")){
	    set_rec_info($rid,"stat","Compile Error");
	    system("rm -rf ". $j_path);
	    return $rid;
	}
	
    $curj = 1;$accepted = 0;$all = 0;
    $p_fnt = "problems/" . $pid . "/data/";
    exec("ls " . $p_fnt . "*.in",$dta);
    foreach ($dta as $cur){
        $all = $all + 1;
        $j_stat = judge($code,$cur,(int)(get_prb_time_limit($pid)),$j_path);
        if ($j_stat == 0){
            push_detail($rid,"Time Limit Exceeded");
        }elseif ($j_stat == 1){
            $file1 = md5_file($j_path . "/data.out");
            $file2 = md5_file(strtok($cur,".") . ".out");
  
            if ($file1 == $file2){
                push_detail($rid,"Accepted");
                $accepted = $accepted + 1;
            }else{
                push_detail($rid,"Wrong Answer");
            }
        }
        $curj = $curj + 1;
    }
    
    system("rm -rf ". $j_path);
    if ($accepted != $all) set_rec_info($rid,"stat","Unaccepted");
    set_rec_info($rid,"score",round(100 * ($accepted / $all)));
    return $rid;
}