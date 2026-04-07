package com.globalhandlooms.dto.marketing;

import lombok.Data;

@Data
public class CreateDiscountRequest {
    private String title;
    private Double percentage;
    private Boolean isActive;
}
