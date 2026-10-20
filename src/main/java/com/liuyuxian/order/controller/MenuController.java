package com.liuyuxian.order.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MenuController {

    private final JdbcTemplate jdbcTemplate;

    public MenuController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record MenuItem(int id, String name, double price, String desc, String status,
                           boolean canChooseSpicy, List<String> spicyOptions,
                           String recommendation, String notes) {}

    @GetMapping("/menu")
    public List<MenuItem> menu() {
        String customerSql = "SELECT id, name, price, description, status, can_choose_spicy, spicy_options, " +
                "recommendation, notes FROM menu WHERE status <> 'OFF_SHELF' ORDER BY id";
        return jdbcTemplate.query(customerSql, (rs, rowNum) -> new MenuItem(
                rs.getInt("id"),
                rs.getString("name"),
                rs.getDouble("price"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getBoolean("can_choose_spicy"),
                parseOptions(rs.getString("spicy_options")),
                rs.getString("recommendation"),
                rs.getString("notes")
        ));
    }

    private static List<String> parseOptions(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
