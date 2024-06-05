-- drop database if exists `games_admin`;
create database if not exists `games_admin`;
use `games_admin`;

CREATE TABLE `user` (
   id int NOT NULL AUTO_INCREMENT,
   name varchar(60) not null,
   user_id varchar(255) unique NOT NULL,
   password varchar(255) NOT NULL,
   profile_url varchar(255) DEFAULT NULL,
   currency_prefrence varchar(11) DEFAULT NULL,
   is_deleted tinyint(1) NOT NULL DEFAULT '0',
   created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;



CREATE TABLE `operator` (
   id int NOT NULL AUTO_INCREMENT,
   user_id varchar(255) unique NOT NULL,
   password varchar(255) NOT NULL,
   profile_url varchar(255) DEFAULT NULL,
   pub_key varchar(60) NOT NULL,
   secret varchar(255) NOT NULL,
   is_deleted tinyint(1) NOT NULL DEFAULT '0',
   created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `games_list` (
	game_id int not null AUTO_INCREMENT,
    name varchar(60) unique not null,
    url varchar(255) unique not null,
    is_active boolean default true,
	created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (game_id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `user_wallet` (
	id int not null AUTO_INCREMENT,
    user_id int not null,
    balance varchar(11) not null,
    is_active boolean default true,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)  ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
