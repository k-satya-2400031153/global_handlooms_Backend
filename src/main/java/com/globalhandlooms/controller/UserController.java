package com.globalhandlooms.controller;

import com.globalhandlooms.dto.ApiResponse;
import com.globalhandlooms.dto.user.AddAddressRequest;
import com.globalhandlooms.dto.user.UpdateProfileRequest;
import com.globalhandlooms.model.Address;
import com.globalhandlooms.model.User;
import com.globalhandlooms.security.UserPrincipal;
import com.globalhandlooms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/user/me
    @GetMapping("/me")
    public ResponseEntity<ApiResponse> getMe(@AuthenticationPrincipal UserPrincipal user) {
        User data = userService.getMe(user.id());
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // PUT /api/user/me
    @PutMapping("/me")
    public ResponseEntity<ApiResponse> updateMe(
            @RequestBody UpdateProfileRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        User data = userService.updateMe(user.id(), req);
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // POST /api/user/address
    @PostMapping("/address")
    public ResponseEntity<ApiResponse> addAddress(
            @RequestBody AddAddressRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        List<Address> addresses = userService.addAddress(user.id(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.builder().success(true).data(addresses).build());
    }

    // DELETE /api/user/address/:addrId
    @DeleteMapping("/address/{addrId}")
    public ResponseEntity<ApiResponse> deleteAddress(
            @PathVariable String addrId,
            @AuthenticationPrincipal UserPrincipal user) {
        List<Address> addresses = userService.deleteAddress(user.id(), addrId);
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(addresses).build());
    }

    // GET /api/user/orders
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse> getMyOrders(@AuthenticationPrincipal UserPrincipal user) {
        List<Map<String, Object>> data = userService.getMyOrders(user.id());
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }
}
