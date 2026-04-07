package com.globalhandlooms.service;

import com.globalhandlooms.dto.product.CreateProductRequest;
import com.globalhandlooms.dto.product.UpdateProductRequest;
import com.globalhandlooms.model.Discount;
import com.globalhandlooms.model.Product;
import com.globalhandlooms.model.User;
import com.globalhandlooms.repository.DiscountRepository;
import com.globalhandlooms.repository.ProductRepository;
import com.globalhandlooms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final DiscountRepository discountRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public List<Map<String, Object>> getProducts(String search, String material, String region) {
        Query query = new Query();
        List<Criteria> criteriaList = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            criteriaList.add(new Criteria().orOperator(
                Criteria.where("title").regex(search, "i"),
                Criteria.where("originRegion").regex(search, "i")
            ));
        }
        if (material != null && !material.isBlank()) {
            criteriaList.add(Criteria.where("materialsUsed").regex(material, "i"));
        }
        if (region != null && !region.isBlank()) {
            criteriaList.add(Criteria.where("originRegion").regex(region, "i"));
        }
        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Product> products = mongoTemplate.find(query, Product.class);

        // Batch-fetch artisans to populate
        Set<String> artisanIds = products.stream()
            .map(Product::getArtisanId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, User> artisanMap = userRepository.findAllById(artisanIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        Optional<Discount> activeDiscount = discountRepository.findByIsActiveTrue();

        return products.stream().map(p -> {
            Map<String, Object> doc = productToMap(p);

            // Populate artisan info (mimics Mongoose .populate())
            User artisan = artisanMap.get(p.getArtisanId());
            if (artisan != null) {
                Map<String, Object> artisanInfo = new LinkedHashMap<>();
                artisanInfo.put("_id", artisan.getId());
                artisanInfo.put("name", artisan.getName());
                artisanInfo.put("email", artisan.getEmail());
                artisanInfo.put("storeName", artisan.getStoreName());
                doc.put("artisanId", artisanInfo);
            }

            // Apply active discount
            doc.put("originalPrice", p.getPrice());
            activeDiscount.ifPresent(d -> {
                double discountedPrice = Math.max(0, p.getPrice() - (p.getPrice() * d.getPercentage() / 100));
                doc.put("price", discountedPrice);
                doc.put("discountBadge", d.getPercentage().intValue() + "% OFF");
            });

            return doc;
        }).collect(Collectors.toList());
    }

    public List<Product> getArtisanProducts(String artisanId) {
        return productRepository.findByArtisanIdOrderByCreatedAtDesc(artisanId);
    }

    public Product createProduct(String artisanId, CreateProductRequest req) {
        if (req.getTitle() == null || req.getPrice() == null || req.getInventory() == null)
            throw new IllegalArgumentException("Title, price, and inventory are required.");
        if (artisanId == null)
            throw new SecurityException("Not authorized to create product.");

        Product product = Product.builder()
            .artisanId(artisanId)
            .title(req.getTitle())
            .price(req.getPrice())
            .inventory(req.getInventory())
            .originRegion(req.getOriginRegion())
            .materialsUsed(parseMaterials(req.getMaterialsUsed()))
            .image(req.getImage() != null ? req.getImage() : "https://via.placeholder.com/400")
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return productRepository.save(product);
    }

    public Product updateProduct(String productId, String requesterId, String requesterRole, UpdateProductRequest req) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.getArtisanId().equals(requesterId) && !"Admin".equals(requesterRole))
            throw new SecurityException("Not authorized to edit this product");

        if (req.getTitle() != null)        product.setTitle(req.getTitle());
        if (req.getPrice() != null)        product.setPrice(req.getPrice());
        if (req.getInventory() != null)    product.setInventory(req.getInventory());
        if (req.getOriginRegion() != null) product.setOriginRegion(req.getOriginRegion());
        if (req.getImage() != null)        product.setImage(req.getImage());
        if (req.getMaterialsUsed() != null) product.setMaterialsUsed(parseMaterials(req.getMaterialsUsed()));
        product.setUpdatedAt(Instant.now());
        return productRepository.save(product);
    }

    public void deleteProduct(String productId, String requesterId, String requesterRole) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));
        if (!product.getArtisanId().equals(requesterId) && !"Admin".equals(requesterRole))
            throw new SecurityException("Not authorized to delete this asset");
        productRepository.deleteById(productId);
    }

    private List<String> parseMaterials(Object materialsUsed) {
        if (materialsUsed == null) return new ArrayList<>();
        if (materialsUsed instanceof List<?> list)
            return list.stream().map(Object::toString).collect(Collectors.toList());
        return Arrays.stream(materialsUsed.toString().split(","))
            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    private Map<String, Object> productToMap(Product p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("_id", p.getId());
        map.put("title", p.getTitle());
        map.put("price", p.getPrice());
        map.put("inventory", p.getInventory());
        map.put("originRegion", p.getOriginRegion());
        map.put("materialsUsed", p.getMaterialsUsed());
        map.put("image", p.getImage());
        map.put("artisanId", p.getArtisanId());
        map.put("createdAt", p.getCreatedAt());
        map.put("updatedAt", p.getUpdatedAt());
        return map;
    }
}
