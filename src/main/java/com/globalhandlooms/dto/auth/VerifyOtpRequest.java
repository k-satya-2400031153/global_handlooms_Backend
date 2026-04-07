package com.globalhandlooms.dto.auth;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String email;
    private String otp;
    private String role;
    private String name;
}
