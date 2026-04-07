package com.globalhandlooms.dto.user;

import lombok.Data;

@Data
public class AddAddressRequest {
    private String label;
    private String fullName;
    private String phone;
    private String addressLine1;
    private String city;
    private String state;
    private String pincode;
}
