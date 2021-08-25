<?php
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libconfig.php");
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libapi.php");
require_once($_SERVER['DOCUMENT_ROOT'] . "/library/libui.php");

ui_header("Homepage");

echo '<head><style>
.slideout-menu{
display:none;
}
.header--mobile{
display:none;
}
</style>
<link type="text/css" rel="styleSheet"  href="style.css" /></head>';

//取得指定位址的內容，並储存至text
$text=file_get_contents('http://1.116.217.97/');
echo '<div style="max-width: 70%;">';
echo $text;
echo '</div>';
ui_footer();
?>
