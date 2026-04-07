package com.globalhandlooms.dto.product;

import lombok.Data;

@Data
public class UpdateProductRequest {
    private String title;
    private Double price;
    private Integer inventory;
    private String originRegion;
    private String image;
    private Object materialsUsed;
}
