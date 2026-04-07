package com.globalhandlooms.service;

import com.globalhandlooms.dto.user.AddAddressRequest;
import com.globalhandlooms.dto.user.UpdateProfileRequest;
import com.globalhandlooms.model.Address;
import com.globalhandlooms.model.Order;
import com.globalhandlooms.model.OrderItem;
import com.globalhandlooms.model.Product;
import com.globalhandlooms.model.User;
import com.globalhandlooms.repository.OrderRepository;
import com.globalhandlooms.repository.ProductRepository;
import com.globalhandlooms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public User getMe(String userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateMe(String userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getName() != null)  user.setName(req.getName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    public List<Address> addAddress(String userId, AddAddressRequest req) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        Address address = Address.builder()
            .id(new org.bson.types.ObjectId().toHexString())
            .label(req.getLabel() != null ? req.getLabel() : "Home")
            .fullName(req.getFullName()).phone(req.getPhone())
            .addressLine1(req.getAddressLine1()).city(req.getCity())
            .state(req.getState()).pincode(req.getPincode())
            .build();
        user.getSavedAddresses().add(address);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        return user.getSavedAddresses();
    }

    public List<Address> deleteAddress(String userId, String addrId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.getSavedAddresses().removeIf(a -> addrId.equals(a.getId()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        return user.getSavedAddresses();
    }

    public List<Map<String, Object>> getMyOrders(String userId) {
        List<Order> orders = orderRepository.findByBuyerIdOrderByCreatedAtDesc(userId);

        Set<String> pids = orders.stream()
            .flatMap(o -> o.getProducts().stream()).map(OrderItem::getProductId).collect(Collectors.toSet());
        Map<String, Product> pMap = productRepository.findAllById(pids).stream()
            .collect(Collectors.toMap(Product::getId, p -> p));

        return orders.stream().map(order -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("_id", order.getId());
            map.put("buyerId", order.getBuyerId());
            map.put("totalAmount", order.getTotalAmount());
            map.put("status", order.getStatus());
            map.put("trackingNumber", order.getTrackingNumber());
            map.put("trackingHistory", order.getTrackingHistory());
            map.put("createdAt", order.getCreatedAt());

            List<Map<String, Object>> items = order.getProducts().stream().map(item -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("quantity", item.getQuantity());
                Product p = pMap.get(item.getProductId());
                if (p != null) {
                    Map<String, Object> pi = new LinkedHashMap<>();
                    pi.put("_id", p.getId()); pi.put("title", p.getTitle());
                    pi.put("price", p.getPrice()); pi.put("image", p.getImage());
                    pi.put("originRegion", p.getOriginRegion());
                    im.put("productId", pi);
                } else { im.put("productId", item.getProductId()); }
                return im;
            }).collect(Collectors.toList());
            map.put("products", items);
            return map;
        }).collect(Collectors.toList());
    }
}
