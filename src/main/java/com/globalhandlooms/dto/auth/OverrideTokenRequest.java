package com.globalhandlooms.dto.auth;

import lombok.Data;

@Data
public class OverrideTokenRequest {
    private String code;
    private String role;
}
