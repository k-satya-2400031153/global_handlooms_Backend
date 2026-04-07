package com.globalhandlooms.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String role; // Admin | Artisan | Buyer | Marketing Specialist
    private String name;
    private String phone;
    private String storeName;
    private String location;

    @Builder.Default
    private List<Address> savedAddresses = new ArrayList<>();

    private String shippingAddress;
    private Boolean isVerified;
    private Instant createdAt;
    private Instant updatedAt;
}
