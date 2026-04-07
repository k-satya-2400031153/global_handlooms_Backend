package com.globalhandlooms.service;

import com.globalhandlooms.dto.order.CreateOrderRequest;
import com.globalhandlooms.dto.order.OrderItemRequest;
import com.globalhandlooms.model.*;
import com.globalhandlooms.repository.OrderRepository;
import com.globalhandlooms.repository.ProductRepository;
import com.globalhandlooms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public Order createOrder(String buyerId, CreateOrderRequest request) {
        if (request.getProducts() == null || request.getProducts().isEmpty())
            throw new IllegalArgumentException("No products provided in order.");

        double calculatedTotal = 0;
        List<OrderItem> processedProducts = new ArrayList<>();

        for (OrderItemRequest item : request.getProducts()) {
            // Atomically decrement inventory (fails if insufficient)
            Query q = Query.query(
                Criteria.where("_id").is(item.getProductId())
                    .and("inventory").gte(item.getQuantity())
            );
            Product product = mongoTemplate.findAndModify(
                q,
                new Update().inc("inventory", -item.getQuantity()),
                FindAndModifyOptions.options().returnNew(false),
                Product.class
            );
            if (product == null)
                throw new IllegalArgumentException("Transaction Failed: Insufficient stock or invalid asset ID.");

            calculatedTotal += product.getPrice() * item.getQuantity();
            processedProducts.add(new OrderItem(item.getProductId(), item.getQuantity()));
        }

        Order order = Order.builder()
            .buyerId(buyerId)
            .products(processedProducts)
            .totalAmount(calculatedTotal)
            .shippingAddress(request.getShippingAddress())
            .paymentId(request.getPaymentId() != null ? request.getPaymentId() : "SIMULATED-" + System.currentTimeMillis())
            .paymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "UPI")
            .trackingNumber(generateTrackingNumber())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return orderRepository.save(order);
    }

    public List<Map<String, Object>> getUserOrders(String buyerId) {
        return populateProducts(orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId));
    }

    public void cancelOrder(String orderId, String buyerId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Transaction not found."));
        if (!order.getBuyerId().equals(buyerId))
            throw new SecurityException("Not authorized to cancel this transaction.");

        // Restore inventory
        for (OrderItem item : order.getProducts()) {
            mongoTemplate.updateFirst(
                Query.query(Criteria.where("_id").is(item.getProductId())),
                new Update().inc("inventory", item.getQuantity()),
                Product.class
            );
        }
        orderRepository.deleteById(orderId);
    }

    public List<Map<String, Object>> getAllOrders() {
        return populateProductsAndBuyer(orderRepository.findAllByOrderByCreatedAtDesc());
    }

    public Order updateOrderStatus(String orderId, String status) {
        List<String> valid = List.of("Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled");
        if (!valid.contains(status))
            throw new IllegalArgumentException("Invalid status. Must be one of: " + String.join(", ", valid));
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found."));
        order.setStatus(status);
        order.setUpdatedAt(Instant.now());
        return orderRepository.save(order);
    }

    public Order updateAutoFulfill(String orderId, Boolean autoFulfillment) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found."));
        order.setAutoFulfillment(autoFulfillment);
        order.setUpdatedAt(Instant.now());
        return orderRepository.save(order);
    }

    private String generateTrackingNumber() {
        String base36 = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        String rand = Integer.toString((int)(Math.random() * 46656), 36).toUpperCase();
        return "GH" + base36 + rand;
    }

    private List<Map<String, Object>> populateProducts(List<Order> orders) {
        Set<String> pids = orders.stream()
            .flatMap(o -> o.getProducts().stream()).map(OrderItem::getProductId).collect(Collectors.toSet());
        Map<String, Product> pMap = productRepository.findAllById(pids).stream()
            .collect(Collectors.toMap(Product::getId, p -> p));

        return orders.stream().map(order -> {
            Map<String, Object> map = orderToMap(order);
            map.put("products", order.getProducts().stream().map(item -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("quantity", item.getQuantity());
                Product p = pMap.get(item.getProductId());
                if (p != null) {
                    Map<String, Object> pi = new LinkedHashMap<>();
                    pi.put("_id", p.getId()); pi.put("title", p.getTitle());
                    pi.put("price", p.getPrice()); pi.put("image", p.getImage());
                    pi.put("originRegion", p.getOriginRegion());
                    im.put("productId", pi);
                } else {
                    im.put("productId", item.getProductId());
                }
                return im;
            }).collect(Collectors.toList()));
            return map;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> populateProductsAndBuyer(List<Order> orders) {
        Set<String> bids = orders.stream().map(Order::getBuyerId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, User> bMap = userRepository.findAllById(bids).stream().collect(Collectors.toMap(User::getId, u -> u));

        Set<String> pids = orders.stream()
            .flatMap(o -> o.getProducts().stream()).map(OrderItem::getProductId).collect(Collectors.toSet());
        Map<String, Product> pMap = productRepository.findAllById(pids).stream()
            .collect(Collectors.toMap(Product::getId, p -> p));

        return orders.stream().map(order -> {
            Map<String, Object> map = orderToMap(order);

            User buyer = bMap.get(order.getBuyerId());
            if (buyer != null) {
                Map<String, Object> bi = new LinkedHashMap<>();
                bi.put("_id", buyer.getId()); bi.put("name", buyer.getName());
                bi.put("email", buyer.getEmail()); bi.put("role", buyer.getRole());
                map.put("buyerId", bi);
            }

            map.put("products", order.getProducts().stream().map(item -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("quantity", item.getQuantity());
                Product p = pMap.get(item.getProductId());
                if (p != null) {
                    Map<String, Object> pi = new LinkedHashMap<>();
                    pi.put("_id", p.getId()); pi.put("title", p.getTitle());
                    pi.put("price", p.getPrice()); pi.put("image", p.getImage());
                    im.put("productId", pi);
                } else {
                    im.put("productId", item.getProductId());
                }
                return im;
            }).collect(Collectors.toList()));

            return map;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> orderToMap(Order o) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("_id", o.getId());
        map.put("buyerId", o.getBuyerId());
        map.put("products", o.getProducts());
        map.put("totalAmount", o.getTotalAmount());
        map.put("shippingAddress", o.getShippingAddress());
        map.put("paymentId", o.getPaymentId());
        map.put("paymentMode", o.getPaymentMode());
        map.put("status", o.getStatus());
        map.put("trackingNumber", o.getTrackingNumber());
        map.put("autoFulfillment", o.getAutoFulfillment());
        map.put("trackingHistory", o.getTrackingHistory());
        map.put("createdAt", o.getCreatedAt());
        map.put("updatedAt", o.getUpdatedAt());
        return map;
    }
}
