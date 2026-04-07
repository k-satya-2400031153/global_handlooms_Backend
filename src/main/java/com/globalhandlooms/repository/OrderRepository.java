package com.globalhandlooms.repository;

import com.globalhandlooms.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    List<Order> findByBuyerIdOrderByCreatedAtDesc(String buyerId);
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findAllByAutoFulfillmentTrueAndStatusNotIn(List<String> statuses);
}
