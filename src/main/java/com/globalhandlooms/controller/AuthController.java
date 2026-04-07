package com.globalhandlooms.controller;

import com.globalhandlooms.dto.ApiResponse;
import com.globalhandlooms.dto.auth.OverrideTokenRequest;
import com.globalhandlooms.dto.auth.SendOtpRequest;
import com.globalhandlooms.dto.auth.VerifyOtpRequest;
import com.globalhandlooms.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/send-otp
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody SendOtpRequest req) {
        if (req.getEmail() == null || req.getEmail().isBlank())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Email is required"));
        return ResponseEntity.ok(authService.sendOtp(req.getEmail()));
    }

    // POST /api/auth/verify-otp
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(authService.verifyOtp(req.getEmail(), req.getOtp(), req.getRole(), req.getName()));
    }

    // POST /api/auth/override-token
    @PostMapping("/override-token")
    public ResponseEntity<?> overrideToken(@RequestBody OverrideTokenRequest req) {
        return ResponseEntity.ok(authService.getOverrideToken(req.getCode(), req.getRole()));
    }
}
