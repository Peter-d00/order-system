USE order_system;

ALTER TABLE menu
  ADD COLUMN can_choose_spicy TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN spicy_options VARCHAR(100),
  ADD COLUMN recommendation VARCHAR(200),
  ADD COLUMN notes VARCHAR(200);

ALTER TABLE order_items
  ADD COLUMN spice_level VARCHAR(20);

UPDATE menu SET can_choose_spicy = 1, spicy_options = '不辣,微辣,中辣,特辣',
  recommendation = '喜欢川味、能吃一点辣的人', notes = '含花生，花生过敏者慎点'
  WHERE id = 1;

UPDATE menu SET can_choose_spicy = 1, spicy_options = '不辣,微辣,中辣,特辣',
  recommendation = '喜欢酸甜微辣、爱下饭的人', notes = '含蒜、姜，忌口者注意'
  WHERE id = 2;

UPDATE menu SET can_choose_spicy = 1, spicy_options = '微辣,中辣,特辣',
  recommendation = '爱吃麻辣、重口味的人', notes = '含花椒，肠胃敏感者慎点'
  WHERE id = 3;

UPDATE menu SET can_choose_spicy = 0, spicy_options = NULL,
  recommendation = '老人、小孩、不吃辣的人', notes = '含鸡蛋，鸡蛋过敏者慎点'
  WHERE id = 4;

UPDATE menu SET can_choose_spicy = 0, spicy_options = NULL,
  recommendation = '喜欢浓油赤酱、肉食爱好者', notes = '肥肉较多，控制油脂者适量'
  WHERE id = 5;

UPDATE menu SET can_choose_spicy = 0, spicy_options = NULL,
  recommendation = '喜欢酸辣开胃的人', notes = '含醋和胡椒，胃酸过多者慎点'
  WHERE id = 6;
