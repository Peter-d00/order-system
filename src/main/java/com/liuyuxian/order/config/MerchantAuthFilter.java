package com.liuyuxian.order.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class MerchantAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        boolean merchantPage = uri.equals("/merchant.html") || uri.equals("/menu-admin.html");
        boolean merchantApi = (uri.equals("/api/orders") && "GET".equalsIgnoreCase(method))
                || (uri.matches("/api/orders/\\d+/status") && "PATCH".equalsIgnoreCase(method))
                || (uri.equals("/api/merchant/menu") && "GET".equalsIgnoreCase(method))
                || (uri.matches("/api/merchant/menu/\\d+/status") && "PATCH".equalsIgnoreCase(method));

        if (merchantPage || merchantApi) {
            HttpSession session = request.getSession(false);
            Object user = session == null ? null : session.getAttribute("merchantUser");
            if (user == null) {
                if (merchantPage) {
                    response.sendRedirect("/login.html");
                    return;
                }
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"message\":\"未登录或登录已过期\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
