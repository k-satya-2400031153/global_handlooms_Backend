package com.globalhandlooms.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "discounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Discount {

    @Id
    private String id;

    private String title;
    private Double percentage;

    @Builder.Default
    private Boolean isActive = false;

    private Instant createdAt;
    private Instant updatedAt;
}
