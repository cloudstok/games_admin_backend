drop database if exists `games_admin`;

create database if not exists `games_admin`;

use `games_admin`;

CREATE TABLE `user` (
    id int NOT NULL AUTO_INCREMENT,
    operator_id varchar(255) not null,
    name varchar(60) not null,
    user_id varchar(255) unique NOT NULL,
    password varchar(255) NOT NULL,
    profile_url varchar(255) DEFAULT NULL,
    currency_prefrence varchar(11) DEFAULT NULL,
    is_wallet boolean default false,
    is_deleted tinyint(1) NOT NULL DEFAULT '0',
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `operator` (
    id int NOT NULL AUTO_INCREMENT,
    name varchar(60) unique not null,
    user_id varchar(60) not null,
    password varchar(255) NOT NULL,
    url varchar(255) DEFAULT NULL,
    pub_key varchar(60) NOT NULL,
    secret varchar(255) NOT NULL,
    user_type ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
    is_deleted tinyint(1) NOT NULL DEFAULT '0',
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `games_master_list` (
    game_id int not null AUTO_INCREMENT,
    name varchar(60) unique not null,
    redirect_url varchar(255) unique ,
    backend_base_url varchar(255) unique ,
    image varchar(255) default null,
    is_active boolean default true,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `user_wallet` (
    id int not null AUTO_INCREMENT,
    user_id VARCHAR(60) unique not null,
    balance varchar(11) not null,
    is_active boolean default true,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `operator_games` (
    id int not null AUTO_INCREMENT,
    game_id int not null,
    operator_id varchar(255) not null,
    is_active boolean default true,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB AUTO_INCREMENT = 2 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ALTER TABLE `operator` ADD COLUMN `user_type` ENUM('admin', 'operator') NOT NULL DEFAULT 'operator' AFTER `secret`;
INSERT INTO
    operator (
        `name`,
        `user_id`,
        `password`,
        `pub_key`,
        `secret`,
        `user_type`
    )
values
(
        'cloudstok',
        'cloudstok_6655',
        '$2b$10$GZeHWlklKMCtMMfzHtdaU.CjqfhXIN4AMUh1X7tAduxjUohSxIXM2',
        '1l3s!i)AajTz',
        'GiJZHWZbal(roHzEbb%TJa(^BD02xHRg',
        'admin'
    );

-- ALTER TABLE `user_wallet` CHANGE COLUMN `user_id` `user_id` VARCHAR(60) NOT NULL ;
insert into
    games_master_list (name, redirect_url, image)
values
(
        'avaitor',
        'https://aviator.ayodhya365.co/',
        'https://jaunpur123.s3.ap-south-1.amazonaws.com/1717673785290_aviator-pic.jpg'
    );

CREATE TABLE transaction (
    id int primary key auto_increment,
    user_id varchar(255),
    session_token varchar(255),
    operator_id varchar(30),
    txn_id VARCHAR(255) unique not null,
    amount varchar(30),
    txn_ref_id varchar(255) default null, 
    description varchar(255),
    txn_type enum('0', '1', '2'),
    txn_status enum('0', '1', '2') default '1',
    created_at timestamp default CURRENT_TIMESTAMP,
    updated_at timestamp default CURRENT_TIMESTAMP
);

CREATE TABLE webhook_config (
    id int primary key auto_increment,
    user_id varchar(255),
    event varchar(255),
    webhook_url VARCHAR(255),
    created_at timestamp default CURRENT_TIMESTAMP,
    updated_at timestamp default CURRENT_TIMESTAMP
);


create table pending_transactions(
    id int primary key auto_increment,
    transaction_id int,
    game_id varchar(255),
    options json,
    cashout_retries int default 0,
    rollback_retries int default 0,
    `event` enum('cashout', 'rollback') default 'cashout',
    txn_status enum('0', '1', '2') default '1',
    created_at timestamp default current_timestamp,
    updated_at timestamp on update current_timestamp
);
