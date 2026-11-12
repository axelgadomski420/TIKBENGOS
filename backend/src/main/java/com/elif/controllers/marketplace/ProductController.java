package com.elif.controllers.marketplace;

import com.elif.dto.marketplace.CreateProductReviewRequest;
import com.elif.dto.marketplace.ProductRequest;
import com.elif.dto.marketplace.ProductReviewResponse;
import com.elif.dto.marketplace.ProductResponse;
import com.elif.services.marketplace.IProductService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/product")
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ProductController {

    private final IProductService productService;

    /**
     * Get all products (PUBLIC - all authenticated users)
     */
    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        try {
            return ResponseEntity.ok(productService.getAllProducts());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get active products only (PUBLIC - all authenticated users)
     */
    @GetMapping("/active")
    public ResponseEntity<List<ProductResponse>> getActiveProducts() {
        try {
            return ResponseEntity.ok(productService.getActiveProducts());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get product by ID (PUBLIC - all authenticated users)
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.getProductById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get reviews for a product (PUBLIC)
     */
    @GetMapping("/{id}/reviews")
    public ResponseEntity<?> getProductReviews(@PathVariable Long id) {
        try {
            List<ProductReviewResponse> reviews = productService.getProductReviews(id);
            return ResponseEntity.ok(reviews);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load product reviews"));
        }
    }

    /**
     * Add a review to product (LOGGED-IN USER)
     */
    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> addProductReview(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody CreateProductReviewRequest request
    ) {
        try {
            ProductReviewResponse review = productService.addProductReview(id, userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(review);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add product review"));
        }
    }

    /**
     * Get favorite products for a user.
     */
    @GetMapping("/favorites")
    public ResponseEntity<?> getFavoriteProducts(@RequestParam Long userId) {
        try {
            return ResponseEntity.ok(productService.getFavoriteProducts(userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to load favorite products"));
        }
    }

    /**
     * Add product to favorites for a user.
     */
    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> addFavoriteProduct(@PathVariable Long id, @RequestParam Long userId) {
        try {
            productService.addFavoriteProduct(id, userId);
            return ResponseEntity.ok(Map.of("message", "Product added to favorites"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add product to favorites"));
        }
    }

    /**
     * Remove product from favorites for a user.
     */
    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<?> removeFavoriteProduct(@PathVariable Long id, @RequestParam Long userId) {
        try {
            productService.removeFavoriteProduct(id, userId);
            return ResponseEntity.ok(Map.of("message", "Product removed from favorites"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to remove product from favorites"));
        }
    }

    /**
     * Get products by category (PUBLIC - all authenticated users)
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<ProductResponse>> getProductsByCategory(@PathVariable String category) {
        try {
            return ResponseEntity.ok(productService.getProductsByCategory(category));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Search products by keyword (PUBLIC - all authenticated users)
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProductResponse>> searchProducts(@RequestParam String keyword) {
        try {
            return ResponseEntity.ok(productService.searchProducts(keyword));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get trending products based on total quantity from placed orders.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<ProductResponse>> getTrendingProducts(@RequestParam(defaultValue = "4") int limit) {
        try {
            return ResponseEntity.ok(productService.getTrendingProducts(limit));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create product (ADMIN ONLY - validation should be added via service or security config)
     * Returns: 201 Created on success, 400 Bad Request for validation errors
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProduct(@ModelAttribute ProductRequest request) {
        try {
            // Validate request
            if (request.getName() == null || request.getName().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Product name is required"));
            }
            if (request.getPrice() == null || request.getPrice().signum() <= 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Price must be positive"));
            }
            if (request.getStock() == null || request.getStock() < 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Stock cannot be negative"));
            }

            ProductResponse product = productService.addProduct(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(product);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create product"));
        }
    }

    /**
     * Update product (ADMIN ONLY - validation should be added via service or security config)
     * Returns: 200 OK on success, 404 Not Found if product doesn't exist
     */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @ModelAttribute ProductRequest request) {
        try {
            ProductResponse product = productService.updateProduct(id, request);
            return ResponseEntity.ok(product);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update product"));
        }
    }

    /**
     * Delete product (ADMIN ONLY - validation should be added via service or security config)
     * Returns: 200 OK on success, 404 Not Found if product doesn't exist
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok(Map.of("message", "Product deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete product"));
        }
    }
}
