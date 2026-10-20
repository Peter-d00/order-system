package com.liuyuxian.order.controller;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/hub")
public class HubController {

    private static final Pattern TUNNEL_URL =
            Pattern.compile("https://[a-z0-9-]+\\.trycloudflare\\.com");

    private final int port;

    public HubController(@Value("${server.port:8080}") int port) {
        this.port = port;
    }

    public record LanAddress(String name, String ip, String url) {}

    @GetMapping("/info")
    public Map<String, Object> info() {
        return Map.of(
                "lan", lanAddresses(),
                "publicUrl", readPublicUrl(),
                "port", port,
                "checkedAt", OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        );
    }

    @GetMapping(value = "/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public void qr(@RequestParam String data, HttpServletResponse response)
            throws IOException, WriterException {
        if (data == null || data.isBlank() || data.length() > 512) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "二维码内容不合法");
            return;
        }
        Map<EncodeHintType, Object> hints = Map.of(
                EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                EncodeHintType.MARGIN, 1,
                EncodeHintType.CHARACTER_SET, "UTF-8"
        );
        BitMatrix matrix = new QRCodeWriter().encode(data, BarcodeFormat.QR_CODE, 320, 320, hints);
        response.setContentType(MediaType.IMAGE_PNG_VALUE);
        MatrixToImageWriter.writeToStream(matrix, "PNG", response.getOutputStream());
    }

    private List<LanAddress> lanAddresses() {
        List<LanAddress> siteLocal = new ArrayList<>();
        List<LanAddress> fallback = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface network = interfaces.nextElement();
                if (!network.isUp() || network.isLoopback()) {
                    continue;
                }
                network.getInterfaceAddresses().forEach(address -> {
                    InetAddress inet = address.getAddress();
                    if (!(inet instanceof Inet4Address) || inet.isLoopbackAddress()) {
                        return;
                    }
                    String ip = inet.getHostAddress();
                    if (!seen.add(ip)) {
                        return;
                    }
                    LanAddress item = new LanAddress(
                            network.getDisplayName(),
                            ip,
                            "http://" + ip + ":" + port + "/?table=A01"
                    );
                    if (inet.isSiteLocalAddress()) {
                        siteLocal.add(item);
                    } else {
                        fallback.add(item);
                    }
                });
            }
        } catch (Exception ignored) {
            // Return whatever addresses could be read.
        }
        return siteLocal.isEmpty() ? fallback : siteLocal;
    }

    private String readPublicUrl() {
        Path current = Path.of("D:/22773/Codex/tools/cloudflared/current-url.txt");
        String fromCurrent = firstMatch(current);
        if (fromCurrent != null) {
            return fromCurrent;
        }
        String last = null;
        for (Path path : List.of(
                Path.of("D:/22773/Codex/tools/cloudflared/tunnel.log"),
                Path.of("D:/22773/Codex/tools/cloudflared/tunnel.err")
        )) {
            String value = lastMatch(path);
            if (value != null) {
                last = value;
            }
        }
        return last == null ? "" : last;
    }

    private static String firstMatch(Path path) {
        String text = readTail(path);
        if (text == null) {
            return null;
        }
        Matcher matcher = TUNNEL_URL.matcher(text);
        return matcher.find() ? matcher.group() : null;
    }

    private static String lastMatch(Path path) {
        String text = readTail(path);
        if (text == null) {
            return null;
        }
        Matcher matcher = TUNNEL_URL.matcher(text);
        String last = null;
        while (matcher.find()) {
            last = matcher.group();
        }
        return last;
    }

    private static String readTail(Path path) {
        try {
            if (!Files.isRegularFile(path)) {
                return null;
            }
            byte[] bytes = Files.readAllBytes(path);
            int start = Math.max(0, bytes.length - 200_000);
            return new String(bytes, start, bytes.length - start, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }
}
