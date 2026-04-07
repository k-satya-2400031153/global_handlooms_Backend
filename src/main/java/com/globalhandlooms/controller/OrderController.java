package com.globalhandlooms.controller;

import com.globalhandlooms.dto.ApiResponse;
import com.globalhandlooms.dto.order.AutoFulfillRequest;
import com.globalhandlooms.dto.order.CreateOrderRequest;
import com.globalhandlooms.dto.order.UpdateOrderStatusRequest;
import com.globalhandlooms.model.Order;
import com.globalhandlooms.security.UserPrincipal;
import com.globalhandlooms.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // POST /api/orders   (Buyer)
    @PostMapping
    public ResponseEntity<ApiResponse> createOrder(
            @RequestBody CreateOrderRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        Order order = orderService.createOrder(user.id(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.builder().success(true).message("Order placed successfully!").data(order).build());
    }

    // GET /api/orders   (Buyer — own orders)
    @GetMapping
    public ResponseEntity<ApiResponse> getUserOrders(@AuthenticationPrincipal UserPrincipal user) {
        List<Map<String, Object>> data = orderService.getUserOrders(user.id());
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // DELETE /api/orders/:id   (Buyer — cancel own order)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> cancelOrder(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal user) {
        orderService.cancelOrder(id, user.id());
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Transaction Voided. Assets refunded to network.").build());
    }

    // GET /api/orders/all   (Admin only)
    @GetMapping("/all")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<ApiResponse> getAllOrders() {
        List<Map<String, Object>> data = orderService.getAllOrders();
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // PATCH /api/orders/:id/status   (Admin only)
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<ApiResponse> updateOrderStatus(
            @PathVariable String id,
            @RequestBody UpdateOrderStatusRequest req) {
        Order order = orderService.updateOrderStatus(id, req.getStatus());
        return ResponseEntity.ok(ApiResponse.builder().success(true)
            .message("Order updated to " + req.getStatus()).data(order).build());
    }

    // PATCH /api/orders/:id/auto-fulfill   (Admin only)
    @PatchMapping("/{id}/auto-fulfill")
    @PreAuthorize("hasAuthority('Admin')")
    public ResponseEntity<ApiResponse> updateAutoFulfill(
            @PathVariable String id,
            @RequestBody AutoFulfillRequest req) {
        Order order = orderService.updateAutoFulfill(id, req.getAutoFulfillment());
        return ResponseEntity.ok(ApiResponse.builder().success(true)
            .message("Auto-Fulfillment set to " + req.getAutoFulfillment()).data(order).build());
    }
}
