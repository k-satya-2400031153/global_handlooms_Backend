package com.globalhandlooms.controller;

import com.globalhandlooms.dto.ApiResponse;
import com.globalhandlooms.dto.product.CreateProductRequest;
import com.globalhandlooms.dto.product.UpdateProductRequest;
import com.globalhandlooms.model.Product;
import com.globalhandlooms.security.UserPrincipal;
import com.globalhandlooms.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // GET /api/products?search=&material=&region=   (public)
    @GetMapping
    public ResponseEntity<ApiResponse> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) String region) {
        List<Map<String, Object>> data = productService.getProducts(search, material, region);
        return ResponseEntity.ok(ApiResponse.builder().success(true).data(data).build());
    }

    // GET /api/products/artisan   (Artisan only — own listings)
    @GetMapping("/artisan")
    @PreAuthorize("hasAuthority('Artisan') or hasAuthority('Admin')")
    public ResponseEntity<?> getArtisanProducts(@AuthenticationPrincipal UserPrincipal user) {
        List<Product> data = productService.getArtisanProducts(user.id());
        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // POST /api/products   (Artisan or Admin)
    @PostMapping
    @PreAuthorize("hasAuthority('Artisan') or hasAuthority('Admin')")
    public ResponseEntity<ApiResponse> createProduct(
            @RequestBody CreateProductRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        Product created = productService.createProduct(user.id(), req);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.builder().success(true).message("Product created successfully").data(created).build());
    }

    // PUT /api/products/:id   (Admin or owning Artisan)
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Artisan')")
    public ResponseEntity<ApiResponse> updateProduct(
            @PathVariable String id,
            @RequestBody UpdateProductRequest req,
            @AuthenticationPrincipal UserPrincipal user) {
        Product updated = productService.updateProduct(id, user.id(), user.role(), req);
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Product updated").data(updated).build());
    }

    // DELETE /api/products/:id   (Admin or owning Artisan)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('Admin') or hasAuthority('Artisan')")
    public ResponseEntity<ApiResponse> deleteProduct(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal user) {
        productService.deleteProduct(id, user.id(), user.role());
        return ResponseEntity.ok(ApiResponse.builder().success(true).message("Asset removed from network").build());
    }
}
