package com.globalhandlooms.dto.order;

import com.globalhandlooms.model.ShippingAddress;
import lombok.Data;
import java.util.List;

@Data
public class CreateOrderRequest {
    private List<OrderItemRequest> products;
    private ShippingAddress shippingAddress;
    private String paymentId;
    private String paymentMode;
}
