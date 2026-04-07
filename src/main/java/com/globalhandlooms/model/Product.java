package com.globalhandlooms.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    private String id;

    private String title;
    private Double price;
    private Integer inventory;
    private String originRegion;

    @Builder.Default
    private List<String> materialsUsed = new ArrayList<>();

    @Builder.Default
    private String image = "https://via.placeholder.com/400";

    private String artisanId;
    private Instant createdAt;
    private Instant updatedAt;
}
