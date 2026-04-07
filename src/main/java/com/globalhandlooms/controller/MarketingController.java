package com.globalhandlooms.controller;

import com.globalhandlooms.dto.ApiResponse;
import com.globalhandlooms.dto.marketing.BroadcastRequest;
import com.globalhandlooms.dto.marketing.CreateDiscountRequest;
import com.globalhandlooms.dto.marketing.UpdateDiscountStatusRequest;
import com.globalhandlooms.model.Discount;
import com.globalhandlooms.service.MarketingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/marketing")
@RequiredArgsConstructor
public class MarketingController {

    private final MarketingService marketingService;

    // GET /api/marketing/discounts/active   (public)
    @GetMapping("/discounts/active")
    public ResponseEntity<ApiResponse> getActiveDiscount() {
        Optional<Discount> active = marketingService.getActiveDiscount();
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(active.orElse(null)).build());
    }

    // POST /api/marketing/broadcast   (Admin + Marketing Specialist)
    @PostMapping("/broadcast")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> broadcast(@RequestBody BroadcastRequest req) {
        String msg = marketingService.broadcastEmail(req);
        return ResponseEntity.ok(ApiResponse.builder().success(true).message(msg).build());
    }

    // POST /api/marketing/discounts   (Admin + Marketing Specialist)
    @PostMapping("/discounts")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> createDiscount(@RequestBody CreateDiscountRequest req) {
        Discount d = marketingService.createDiscount(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.builder().success(true).data(d).build());
    }

    // GET /api/marketing/discounts   (Admin + Marketing Specialist)
    @GetMapping("/discounts")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> getDiscounts() {
        List<Discount> data = marketingService.getDiscounts();
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // PATCH /api/marketing/discounts/:id/status   (Admin + Marketing Specialist)
    @PatchMapping("/discounts/{id}/status")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> updateDiscountStatus(
            @PathVariable String id,
            @RequestBody UpdateDiscountStatusRequest req) {
        Discount d = marketingService.updateDiscountStatus(id, req.getIsActive());
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(d).build());
    }

    // DELETE /api/marketing/discounts/:id   (Admin + Marketing Specialist)
    @DeleteMapping("/discounts/{id}")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> deleteDiscount(@PathVariable String id) {
        marketingService.deleteDiscount(id);
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Discount deleted").build());
    }

    // GET /api/marketing/analytics   (Admin + Marketing Specialist)
    @GetMapping("/analytics")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Marketing Specialist')")
    public ResponseEntity<ApiResponse> getAnalytics() {
        Map<String, Object> data = marketingService.getAnalytics();
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }
}
