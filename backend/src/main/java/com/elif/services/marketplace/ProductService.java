package com.elif.services.marketplace;

import com.elif.dto.marketplace.CreateProductReviewRequest;
import com.elif.dto.marketplace.ProductReviewResponse;
import com.elif.dto.marketplace.ProductRequest;
import com.elif.dto.marketplace.ProductResponse;
import com.elif.entities.marketplace.FavoriteProduct;
import com.elif.entities.marketplace.Order;
import com.elif.entities.marketplace.Product;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.elif.entities.marketplace.ProductReview;
import com.elif.repositories.marketplace.FavoriteProductRepository;
import com.elif.repositories.marketplace.OrderRepository;
import com.elif.repositories.marketplace.ProductRepository;
import com.elif.repositories.marketplace.ProductReviewRepository;
import com.elif.repositories.user.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Base64;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ProductService implements IProductService {

    private final ProductRepository productRepository;
    private final ProductReviewRepository productReviewRepository;
    private final FavoriteProductRepository favoriteProductRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Override
    public ProductResponse addProduct(ProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .price(request.getPrice())
                .stock(request.getStock())
            .petSpecies(request.getPetSpecies() != null ? request.getPetSpecies() : PetSpecies.OTHER)
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        applyImage(product, request.getImageFile());

        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    @Override
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (request.getName() != null) product.setName(request.getName());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getCategory() != null) product.setCategory(request.getCategory());
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getStock() != null) product.setStock(request.getStock());
        if (request.getPetSpecies() != null) product.setPetSpecies(request.getPetSpecies());
        if (request.getActive() != null) product.setActive(request.getActive());
        applyImage(product, request.getImageFile());

        Product updated = productRepository.save(product);
        return mapToResponse(updated);
    }

    @Override
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new IllegalArgumentException("Product not found");
        }

        boolean hasPendingOrders = orderRepository.existsByStatusAndOrderItems_ProductId(Order.OrderStatus.PENDING, id);
        if (hasPendingOrders) {
            throw new IllegalStateException("Cannot delete product because it is part of pending orders");
        }

        productRepository.deleteById(id);
    }

    @Override
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        return mapToResponse(product);
    }

    @Override
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> getActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> getProductsByCategory(String category) {
        return productRepository.findByActiveTrueAndCategory(category).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> searchProducts(String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword).stream()
                .filter(Product::getActive)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<ProductResponse> getTrendingProducts(int limit) {
        int normalizedLimit = Math.max(1, Math.min(limit, 20));
        List<Long> trendingIds = productRepository.findTrendingProductIds(PageRequest.of(0, normalizedLimit));
        if (trendingIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Product> productsById = productRepository.findAllById(trendingIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        return trendingIds.stream()
                .map(productsById::get)
            .filter(product -> product != null
                && Boolean.TRUE.equals(product.getActive())
                && product.getStock() != null
                && product.getStock() > 0)
                .map(this::mapToResponse)
                .limit(normalizedLimit)
                .toList();
    }

    @Override
    public List<ProductReviewResponse> getProductReviews(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new IllegalArgumentException("Product not found");
        }

        return productReviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(this::mapReviewToResponse)
                .toList();
    }

    @Override
    public ProductReviewResponse addProductReview(Long productId, Long userId, CreateProductReviewRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        if (productReviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new IllegalStateException("You have already reviewed this product");
        }

        String reviewerName = userRepository.findById(userId)
                .map(user -> (user.getFirstName() + " " + user.getLastName()).trim())
                .filter(name -> !name.isBlank())
                .orElse("User #" + userId);

        ProductReview review = ProductReview.builder()
                .product(product)
                .userId(userId)
                .reviewerName(reviewerName)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        ProductReview saved = productReviewRepository.save(review);
        return mapReviewToResponse(saved);
    }

    @Override
    public List<ProductResponse> getFavoriteProducts(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        return favoriteProductRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(FavoriteProduct::getProduct)
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public void addFavoriteProduct(Long productId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        if (favoriteProductRepository.existsByProductIdAndUserId(productId, userId)) {
            return;
        }

        FavoriteProduct favorite = FavoriteProduct.builder()
                .product(product)
                .userId(userId)
                .build();

        favoriteProductRepository.save(favorite);
    }

    @Override
    public void removeFavoriteProduct(Long productId, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }

        favoriteProductRepository.deleteByProductIdAndUserId(productId, userId);
    }

    private ProductResponse mapToResponse(Product product) {
        Double averageRating = productReviewRepository.findAverageRatingByProductId(product.getId());
        long reviewCount = productReviewRepository.countByProductId(product.getId());

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .category(product.getCategory())
                .price(product.getPrice())
                .stock(product.getStock())
                .petSpecies(product.getPetSpecies() != null ? product.getPetSpecies() : PetSpecies.OTHER)
                .imageUrl(toDataUrl(product.getImageData(), product.getImageContentType()))
                .active(product.getActive())
                .averageRating(averageRating == null ? 0.0 : Math.round(averageRating * 10.0) / 10.0)
                .reviewCount(reviewCount)
                .build();
    }

    private ProductReviewResponse mapReviewToResponse(ProductReview review) {
        return ProductReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUserId())
                .reviewerName(review.getReviewerName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private void applyImage(Product product, MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            return;
        }

        try {
            product.setImageData(imageFile.getBytes());
            product.setImageContentType(imageFile.getContentType());
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to process product image", e);
        }
    }

    private String toDataUrl(byte[] data, String contentType) {
        if (data == null || data.length == 0) {
            return null;
        }

        String mimeType = (contentType == null || contentType.isBlank()) ? "image/jpeg" : contentType;
        String base64 = Base64.getEncoder().encodeToString(data);
        return "data:" + mimeType + ";base64," + base64;
    }
}
