package com.liuyuxian.order.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final String username;
    private final String passwordHash;

    public AuthController(@Value("${merchant.username:admin}") String username,
                          @Value("${merchant.password-sha256}") String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;
    }

    public record LoginRequest(String username, String password) {}

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request, HttpSession session) {
        if (request == null || request.username() == null || request.password() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "用户名和密码不能为空");
        }
        boolean userOk = username.equals(request.username().trim());
        boolean passwordOk = passwordHash.equalsIgnoreCase(sha256(request.password()));
        if (!userOk || !passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
        }
        session.setAttribute("merchantUser", username);
        return Map.of("authenticated", true, "username", username);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpSession session) {
        session.invalidate();
        return Map.of("authenticated", false);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpSession session) {
        Object user = session.getAttribute("merchantUser");
        if (user == null) {
            return Map.of("authenticated", false);
        }
        return Map.of("authenticated", true, "username", user);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
