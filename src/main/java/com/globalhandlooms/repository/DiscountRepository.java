package com.globalhandlooms.repository;

import com.globalhandlooms.model.Discount;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountRepository extends MongoRepository<Discount, String> {
    Optional<Discount> findByIsActiveTrue();
    List<Discount> findAllByOrderByCreatedAtDesc();
}
