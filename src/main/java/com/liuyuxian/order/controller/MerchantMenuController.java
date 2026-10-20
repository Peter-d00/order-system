package com.liuyuxian.order.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/merchant/menu")
public class MerchantMenuController {

    private static final List<String> ALLOWED_STATUSES = List.of("ON_SALE", "SOLD_OUT", "OFF_SHELF");

    private final JdbcTemplate jdbcTemplate;

    public MerchantMenuController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record MenuAdminItem(int id, String name, BigDecimal price, String description, String status,
                                boolean canChooseSpicy, List<String> spicyOptions,
                                String recommendation, String notes) {}

    public record UpdateStatusRequest(String status) {}

    @GetMapping
    public List<MenuAdminItem> list() {
        return jdbcTemplate.query(
                "SELECT id, name, price, description, status, can_choose_spicy, spicy_options, " +
                        "recommendation, notes FROM menu ORDER BY id",
                (rs, rowNum) -> toItem(rs)
        );
    }

    @PatchMapping("/{id}/status")
    public MenuAdminItem updateStatus(@PathVariable int id, @RequestBody UpdateStatusRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "状态不能为空");
        }
        String status = request.status().trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "状态不合法: " + request.status());
        }
        int updated = jdbcTemplate.update(
                "UPDATE menu SET status = ?, available = CASE WHEN ? = 'ON_SALE' THEN 1 ELSE 0 END WHERE id = ?",
                status, status, id
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "菜品不存在");
        }
        return findById(id);
    }

    private MenuAdminItem findById(int id) {
        List<MenuAdminItem> rows = jdbcTemplate.query(
                "SELECT id, name, price, description, status, can_choose_spicy, spicy_options, " +
                        "recommendation, notes FROM menu WHERE id = ?",
                (rs, rowNum) -> toItem(rs),
                id
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "菜品不存在");
        }
        return rows.get(0);
    }

    private static MenuAdminItem toItem(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MenuAdminItem(
                rs.getInt("id"),
                rs.getString("name"),
                rs.getBigDecimal("price"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getBoolean("can_choose_spicy"),
                parseOptions(rs.getString("spicy_options")),
                rs.getString("recommendation"),
                rs.getString("notes")
        );
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
