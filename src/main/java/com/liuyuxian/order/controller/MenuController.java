package com.liuyuxian.order.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MenuController {

    // 第一步：菜单数据先写在代码里；第二步我们会改成从数据库读取
    public record MenuItem(int id, String name, double price, String desc) {}

    private static final List<MenuItem> MENU = List.of(
            new MenuItem(1, "宫保鸡丁", 28.0, "经典川菜，花生米配大块鸡丁"),
            new MenuItem(2, "鱼香肉丝", 26.0, "酸甜微辣，米饭杀手"),
            new MenuItem(3, "麻婆豆腐", 18.0, "麻辣鲜香，豆腐嫩滑"),
            new MenuItem(4, "番茄炒蛋", 16.0, "家常味道，老少皆宜"),
            new MenuItem(5, "红烧肉", 38.0, "肥而不腻，入口即化"),
            new MenuItem(6, "酸辣汤", 12.0, "酸辣开胃，餐前暖胃")
    );

    @GetMapping("/menu")
    public List<MenuItem> menu() {
        return MENU;
    }
}
