var host = 'localhost';
var user = 'Hikari';
var password = '123456';
var database = 'Hikari';

/* 数据表user
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `Email` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `luoguUID` int(11) NOT NULL DEFAULT '1',
  `tag` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `grade` int(11) NOT NULL DEFAULT '1',
  `message` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=MyISAM AUTO_INCREMENT=262 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
*/

/*数据表problem
CREATE TABLE `hikari`.`problem` ( `id` INT AUTO_INCREMENT NOT NULL , 
  `title` VARCHAR(100) NOT NULL , 
  `provider` INT NOT NULL , 
  `time` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL ,
  `tag` VARCHAR(100) NOT NULL ,
  `gescription` LONGTEXT NOT NULL ,
  `input` LONGTEXT NOT NULL ,
  `output` LONGTEXT NOT NULL , 
  `sample` LONGTEXT NOT NULL ,
  `hint` LONGTEXT NOT NULL ,
  `data` LONGTEXT NOT NULL , 
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
*/

/*评测记录数据库record
CREATE TABLE `hikari`.`record` ( 
  `id` INT AUTO_INCREMENT NOT NULL ,
  `rid` BIGINT NOT NULL , 
  `pid` INT NOT NULL ,
  `uid` INT NOT NULL , 
  `code` LONGTEXT NOT NULL ,
  `stat` VARCHAR(30) NOT NULL ,
  `pts` INT NOT NULL , 
  `detail` LONGTEXT NOT NULL , 
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;
*/
module.exports = {
  host,user,password,database
};
