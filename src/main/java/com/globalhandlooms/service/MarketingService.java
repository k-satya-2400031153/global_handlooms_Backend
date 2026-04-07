package com.globalhandlooms.service;

import com.globalhandlooms.dto.marketing.BroadcastRequest;
import com.globalhandlooms.dto.marketing.CreateDiscountRequest;
import com.globalhandlooms.model.Discount;
import com.globalhandlooms.model.Order;
import com.globalhandlooms.model.OrderItem;
import com.globalhandlooms.model.User;
import com.globalhandlooms.repository.DiscountRepository;
import com.globalhandlooms.repository.OrderRepository;
import com.globalhandlooms.repository.ProductRepository;
import com.globalhandlooms.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketingService {

    private final UserRepository userRepository;
    private final DiscountRepository discountRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public String broadcastEmail(BroadcastRequest req) {
        if (req.getSubject() == null || req.getHtmlBody() == null)
            throw new IllegalArgumentException("Subject and HTML body are required.");

        List<User> buyers = userRepository.findAllByRole("Buyer");
        if (buyers.isEmpty())
            throw new IllegalArgumentException("No buyers found in the network.");

        String bcc = buyers.stream().map(User::getEmail).collect(Collectors.joining(", "));
        String html = "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:20px;border-radius:8px;border:1px solid #00f0ff\">" +
            "<h1 style=\"color:#00f0ff;text-align:center\">GLOBAL HANDLOOMS</h1>" +
            "<div style=\"background:#111;padding:20px;border-radius:4px\">" + req.getHtmlBody() + "</div>" +
            "<p style=\"text-align:center;color:#666;font-size:12px;margin-top:30px;border-top:1px solid #333;padding-top:20px\">" +
            "You are receiving this because you registered on the Global Handlooms decentralized network.</p></div>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(fromEmail);
            helper.setBcc(bcc);
            helper.setSubject("Global Handlooms: " + req.getSubject());
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Broadcast failed: {}", e.getMessage());
            throw new RuntimeException("Server failed to deploy broadcast. Check SMTP credentials.");
        }
        return "Broadcast deployed to " + buyers.size() + " buyers successfully.";
    }

    public Discount createDiscount(CreateDiscountRequest req) {
        if (Boolean.TRUE.equals(req.getIsActive()))
            discountRepository.findAll().forEach(d -> { d.setIsActive(false); discountRepository.save(d); });

        Discount discount = Discount.builder()
            .title(req.getTitle()).percentage(req.getPercentage())
            .isActive(req.getIsActive() != null && req.getIsActive())
            .createdAt(Instant.now()).updatedAt(Instant.now())
            .build();
        return discountRepository.save(discount);
    }

    public List<Discount> getDiscounts() {
        return discountRepository.findAllByOrderByCreatedAtDesc();
    }

    public Discount updateDiscountStatus(String id, Boolean isActive) {
        if (Boolean.TRUE.equals(isActive))
            discountRepository.findAll().forEach(d -> { d.setIsActive(false); discountRepository.save(d); });

        Discount discount = discountRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Discount not found"));
        discount.setIsActive(isActive);
        discount.setUpdatedAt(Instant.now());
        return discountRepository.save(discount);
    }

    public void deleteDiscount(String id) {
        discountRepository.deleteById(id);
    }

    public Optional<Discount> getActiveDiscount() {
        return discountRepository.findByIsActiveTrue();
    }

    public Map<String, Object> getAnalytics() {
        List<Order> orders = orderRepository.findAll();
        long totalBuyers = userRepository.countByRole("Buyer");

        // Revenue per product
        Map<String, Map<String, Object>> productMap = new LinkedHashMap<>();
        orders.forEach(order -> order.getProducts().forEach(item -> {
            String pid = item.getProductId();
            if (pid == null) return;
            productMap.computeIfAbsent(pid, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("title", "Unknown"); m.put("region", ""); m.put("revenue", 0.0);
                m.put("unitsSold", 0); m.put("buyers", new HashSet<String>());
                return m;
            });
            Map<String, Object> pm = productMap.get(pid);
            pm.put("unitsSold", (int) pm.get("unitsSold") + item.getQuantity());
            ((Set<String>) pm.get("buyers")).add(order.getBuyerId() != null ? order.getBuyerId() : "unknown");
        }));

        // Enrich with product data
        productRepository.findAllById(productMap.keySet()).forEach(p -> {
            Map<String, Object> pm = productMap.get(p.getId());
            if (pm != null) { pm.put("title", p.getTitle()); pm.put("region", p.getOriginRegion()); }
        });

        List<Map<String, Object>> topProducts = productMap.values().stream()
            .map(pm -> { Map<String, Object> r = new LinkedHashMap<>(pm); r.put("buyers", ((Set<?>) pm.get("buyers")).size()); return r; })
            .sorted((a, b) -> Double.compare((Double) b.get("revenue"), (Double) a.get("revenue")))
            .limit(6).collect(Collectors.toList());

        List<Map<String, Object>> recentActivity = orders.stream()
            .sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(10).map(o -> {
                Map<String, Object> a = new LinkedHashMap<>();
                a.put("buyerName", "Unknown"); a.put("buyerEmail", "—");
                a.put("status", o.getStatus()); a.put("total", o.getTotalAmount());
                a.put("items", o.getProducts().stream().map(item -> item.getProductId()).collect(Collectors.joining(", ")));
                a.put("createdAt", o.getCreatedAt());
                return a;
            }).collect(Collectors.toList());

        double totalRevenue = orders.stream()
            .filter(o -> "Delivered".equals(o.getStatus()))
            .mapToDouble(o -> o.getTotalAmount() != null ? o.getTotalAmount() : 0).sum();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("topProducts", topProducts);
        data.put("recentActivity", recentActivity);
        data.put("totalBuyers", totalBuyers);
        data.put("totalRevenue", totalRevenue);
        data.put("totalOrders", orders.size());
        return data;
    }
}
