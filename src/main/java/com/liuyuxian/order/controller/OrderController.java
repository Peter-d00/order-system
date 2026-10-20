package com.liuyuxian.order.controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final JdbcTemplate jdbcTemplate;

    public OrderController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record OrderItemRequest(int menuId, int quantity, String spiceLevel) {}
    public record CreateOrderRequest(String tableNo, List<OrderItemRequest> items) {}
    public record UpdateStatusRequest(String status) {}
    public record OrderItemView(int menuId, String name, BigDecimal price, int quantity, String spiceLevel) {}
    public record OrderView(int id, String tableNo, BigDecimal totalPrice, String status,
                            String createdAt, List<OrderItemView> items) {}

    @PostMapping
    @Transactional
    public OrderView create(@RequestBody CreateOrderRequest request) {
        if (request == null || request.tableNo() == null || request.tableNo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "桌号不能为空");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "订单不能为空");
        }

        String tableNo = request.tableNo().trim();
        BigDecimal total = BigDecimal.ZERO;
        List<OrderItemView> items = new ArrayList<>();

        for (OrderItemRequest item : request.items()) {
            if (item == null || item.quantity() <= 0 || item.quantity() > 99) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "菜品数量不合法");
            }
            MenuRow menu = jdbcTemplate.query(
                    "SELECT id, name, price, status, can_choose_spicy, spicy_options FROM menu WHERE id = ?",
                    rs -> rs.next()
                            ? new MenuRow(rs.getInt("id"), rs.getString("name"),
                            rs.getBigDecimal("price"), rs.getString("status"),
                            rs.getBoolean("can_choose_spicy"), rs.getString("spicy_options"))
                            : null,
                    item.menuId()
            );
            if (menu == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "菜品不存在: " + item.menuId());
            }
            if (!"ON_SALE".equals(menu.status())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "菜品已售罄或下架: " + menu.name());
            }
            String spiceLevel = resolveSpiceLevel(menu, item.spiceLevel());
            total = total.add(menu.price().multiply(BigDecimal.valueOf(item.quantity())));
            items.add(new OrderItemView(menu.id(), menu.name(), menu.price(), item.quantity(), spiceLevel));
        }

        BigDecimal finalTotal = total;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO orders (table_no, total_price, status) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, tableNo);
            ps.setBigDecimal(2, finalTotal);
            ps.setString(3, "PENDING");
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "订单创建失败");
        }
        int orderId = key.intValue();

        for (OrderItemView item : items) {
            jdbcTemplate.update(
                    "INSERT INTO order_items (order_id, menu_id, dish_name, price, quantity, spice_level) " +
                            "VALUES (?, ?, ?, ?, ?, ?)",
                    orderId, item.menuId(), item.name(), item.price(), item.quantity(), item.spiceLevel()
            );
        }

        return findById(orderId);
    }

    @GetMapping
    public List<OrderView> list(@RequestParam(required = false) String status) {
        String normalized = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (normalized != null && !List.of("PENDING", "PREPARING", "DONE").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "状态不合法: " + status);
        }

        String sql = "SELECT id, table_no, total_price, status, created_at FROM orders";
        if (normalized != null) {
            sql += " WHERE status = ?";
        }
        sql += " ORDER BY created_at DESC, id DESC LIMIT 50";

        List<OrderView> rows = normalized == null
                ? jdbcTemplate.query(sql, (rs, rowNum) -> toOrderView(rs))
                : jdbcTemplate.query(sql, (rs, rowNum) -> toOrderView(rs), normalized);
        return rows.stream().map(order -> findById(order.id())).toList();
    }

    @GetMapping("/{id}")
    public OrderView get(@PathVariable int id) {
        return findById(id);
    }

    @PatchMapping("/{id}/status")
    public OrderView updateStatus(@PathVariable int id, @RequestBody UpdateStatusRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "状态不能为空");
        }
        OrderView current = findById(id);
        String target = request.status().trim().toUpperCase();
        if (current.status().equals(target)) {
            return current;
        }
        String allowed = switch (current.status()) {
            case "PENDING" -> "PREPARING";
            case "PREPARING" -> "DONE";
            default -> null;
        };
        if (!target.equals(allowed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "不能从 " + current.status() + " 变为 " + target);
        }
        int updated = jdbcTemplate.update(
                "UPDATE orders SET status = ? WHERE id = ? AND status = ?",
                target, id, current.status()
        );
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "订单状态已变化，请刷新");
        }
        return findById(id);
    }

    private OrderView toOrderView(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new OrderView(
                rs.getInt("id"),
                rs.getString("table_no"),
                rs.getBigDecimal("total_price"),
                rs.getString("status"),
                rs.getTimestamp("created_at").toLocalDateTime().toString(),
                List.of()
        );
    }

    private OrderView findById(int id) {
        List<OrderView> orders = jdbcTemplate.query(
                "SELECT id, table_no, total_price, status, created_at FROM orders WHERE id = ?",
                (rs, rowNum) -> new OrderView(
                        rs.getInt("id"),
                        rs.getString("table_no"),
                        rs.getBigDecimal("total_price"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at").toLocalDateTime().toString(),
                        List.of()
                ),
                id
        );
        if (orders.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "订单不存在");
        }
        OrderView order = orders.get(0);
        List<OrderItemView> items = jdbcTemplate.query(
                "SELECT menu_id, dish_name, price, quantity, spice_level FROM order_items " +
                        "WHERE order_id = ? ORDER BY id",
                (rs, rowNum) -> new OrderItemView(
                        rs.getInt("menu_id"),
                        rs.getString("dish_name"),
                        rs.getBigDecimal("price"),
                        rs.getInt("quantity"),
                        rs.getString("spice_level")
                ),
                id
        );
        return new OrderView(order.id(), order.tableNo(), order.totalPrice(), order.status(),
                order.createdAt(), items);
    }

    private static String resolveSpiceLevel(MenuRow menu, String requested) {
        if (!menu.canChooseSpicy()) {
            return null;
        }
        List<String> options = parseOptions(menu.spicyOptions());
        String value = requested == null ? "" : requested.trim();
        if (value.isEmpty()) {
            return options.isEmpty() ? null : options.get(0);
        }
        if (!options.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "辣度不合法: " + value);
        }
        return value;
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

    private record MenuRow(int id, String name, BigDecimal price, String status,
                           boolean canChooseSpicy, String spicyOptions) {}
}
