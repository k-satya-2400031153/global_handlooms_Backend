package com.globalhandlooms.model;

import lombok.*;
import org.springframework.data.annotation.Id;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Address {
    @Id
    private String id;
    @Builder.Default
    private String label = "Home";
    private String fullName;
    private String phone;
    private String addressLine1;
    private String city;
    private String state;
    private String pincode;
}
