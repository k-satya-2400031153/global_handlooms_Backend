package com.globalhandlooms.dto.product;

import lombok.Data;
import java.util.List;

@Data
public class CreateProductRequest {
    private String title;
    private String description;
    private Double price;
    private Object materialsUsed; // String or List<String> from frontend
    private String originRegion;
    private Integer inventory;
    private String image;
}
