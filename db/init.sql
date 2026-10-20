CREATE DATABASE IF NOT EXISTS order_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE order_system;

CREATE TABLE IF NOT EXISTS menu (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description VARCHAR(200),
  available TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ON_SALE',
  can_choose_spicy TINYINT(1) NOT NULL DEFAULT 0,
  spicy_options VARCHAR(100),
  recommendation VARCHAR(200),
  notes VARCHAR(200)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO menu (name, price, description, available, status, can_choose_spicy, spicy_options, recommendation, notes) VALUES
  ('宫保鸡丁', 28.00, '经典川菜，花生米配大块鸡丁', 1, 'ON_SALE', 1, '不辣,微辣,中辣,特辣', '喜欢川味、能吃一点辣的人', '含花生，花生过敏者慎点'),
  ('鱼香肉丝', 26.00, '酸甜微辣，米饭杀手', 1, 'ON_SALE', 1, '不辣,微辣,中辣,特辣', '喜欢酸甜微辣、爱下饭的人', '含蒜、姜，忌口者注意'),
  ('麻婆豆腐', 18.00, '麻辣鲜香，豆腐嫩滑', 1, 'ON_SALE', 1, '微辣,中辣,特辣', '爱吃麻辣、重口味的人', '含花椒，肠胃敏感者慎点'),
  ('番茄炒蛋', 16.00, '家常味道，老少皆宜', 1, 'ON_SALE', 0, NULL, '老人、小孩、不吃辣的人', '含鸡蛋，鸡蛋过敏者慎点'),
  ('红烧肉', 38.00, '肥而不腻，入口即化', 1, 'ON_SALE', 0, NULL, '喜欢浓油赤酱、肉食爱好者', '肥肉较多，控制油脂者适量'),
  ('酸辣汤', 12.00, '酸辣开胃，餐前暖胃', 1, 'ON_SALE', 0, NULL, '喜欢酸辣开胃的人', '含醋和胡椒，胃酸过多者慎点');

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_no VARCHAR(20) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  menu_id INT NOT NULL,
  dish_name VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  spice_level VARCHAR(20),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_id) REFERENCES menu(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
