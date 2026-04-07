package com.globalhandlooms.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    private String id;

    private String buyerId;

    @Builder.Default
    private List<OrderItem> products = new ArrayList<>();

    private Double totalAmount;
    private ShippingAddress shippingAddress;
    private String paymentId;

    @Builder.Default
    private String paymentMode = "UPI";

    @Builder.Default
    private String status = "Pending";

    private String trackingNumber;

    @Builder.Default
    private Boolean autoFulfillment = true;

    @Builder.Default
    private List<TrackingEvent> trackingHistory = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;
}
