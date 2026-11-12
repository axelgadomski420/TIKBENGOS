package com.elif.services.marketplace;

import com.elif.dto.marketplace.CreateOrderRequest;
import com.elif.dto.marketplace.OrderItemRequest;
import com.elif.dto.marketplace.OrderResponse;
import com.elif.dto.marketplace.StripeCheckoutRequest;
import com.elif.dto.marketplace.StripeCheckoutResponse;
import com.elif.dto.marketplace.StripeConfirmOrderRequest;
import com.elif.entities.marketplace.Order;
import com.elif.entities.marketplace.PromoCodeReward;
import com.elif.entities.marketplace.Product;
import com.elif.repositories.marketplace.OrderRepository;
import com.elif.repositories.marketplace.PromoCodeRewardRepository;
import com.elif.repositories.marketplace.ProductRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;
import java.util.TreeMap;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PromoCodeRewardRepository promoCodeRewardRepository;
    private final IOrderService orderService;

    @Value("${stripe.secret-key:}")
    private String stripeSecretKey;

    public StripeCheckoutResponse createCheckoutSession(StripeCheckoutRequest request) {
        ensureStripeConfigured();

        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User id is required for Stripe checkout.");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty.");
        }

        String normalizedPromoCode = normalizePromoCode(request.getPromoCode());
        PromoCodeReward promoReward = resolvePromoRewardForCheckout(request.getUserId(), normalizedPromoCode);

        String cartSignature = buildCartSignature(request.getItems(), normalizedPromoCode);

        if (request.getSuccessUrl() == null || request.getSuccessUrl().isBlank() ||
                request.getCancelUrl() == null || request.getCancelUrl().isBlank()) {
            throw new IllegalArgumentException("Success and cancel URLs are required.");
        }

        List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();

        BigDecimal discountRate = promoReward == null
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(promoReward.getDiscountPercent())
            .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        for (OrderItemRequest itemRequest : request.getItems()) {
            Long productId = Objects.requireNonNull(itemRequest.getProductId(),
                "Product id is required for Stripe checkout item.");

            Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

            if (itemRequest.getQuantity() == null || itemRequest.getQuantity() < 1) {
                throw new IllegalArgumentException("Invalid quantity for product: " + product.getName());
            }

            if (product.getStock() < itemRequest.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
            }

            BigDecimal effectiveUnitPrice = product.getPrice();
            if (promoReward != null) {
                BigDecimal multiplier = BigDecimal.ONE.subtract(discountRate);
                effectiveUnitPrice = product.getPrice().multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
                if (effectiveUnitPrice.compareTo(new BigDecimal("0.01")) < 0) {
                    effectiveUnitPrice = new BigDecimal("0.01");
                }
            }

            long unitAmountInCents = toCents(effectiveUnitPrice);

            SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                    .setQuantity(itemRequest.getQuantity().longValue())
                    .setPriceData(
                            SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("usd")
                                    .setUnitAmount(unitAmountInCents)
                                    .setProductData(
                                            SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                    .setName(product.getName())
                                                    .build()
                                    )
                                    .build()
                    )
                    .build();

            lineItems.add(lineItem);
        }

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(request.getSuccessUrl())
                .setCancelUrl(request.getCancelUrl())
                .addAllLineItem(lineItems)
                .putMetadata("userId", String.valueOf(request.getUserId()))
                .putMetadata("cartSignature", cartSignature)
                .putMetadata("promoCode", normalizedPromoCode == null ? "" : normalizedPromoCode)
                .build();

        try {
            Session session = Session.create(params);
            return StripeCheckoutResponse.builder()
                    .sessionId(session.getId())
                    .checkoutUrl(session.getUrl())
                    .build();
        } catch (StripeException e) {
            throw new IllegalArgumentException("Unable to create Stripe checkout session: " + e.getMessage());
        }
    }

    public OrderResponse confirmPaidOrder(StripeConfirmOrderRequest request) {
        ensureStripeConfigured();

        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User id is required to confirm Stripe checkout.");
        }

        if (request.getSessionId() == null || request.getSessionId().isBlank()) {
            throw new IllegalArgumentException("Stripe session id is required.");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Original checkout items are required to confirm Stripe payment.");
        }

        String normalizedPromoCode = normalizePromoCode(request.getPromoCode());

        String sessionId = request.getSessionId().trim();

        Order existingOrder = orderRepository.findByStripeSessionId(sessionId).orElse(null);
        if (existingOrder != null) {
            return orderService.getOrderById(existingOrder.getId());
        }

        Session session;
        try {
            session = Session.retrieve(sessionId);
        } catch (StripeException e) {
            throw new IllegalArgumentException("Unable to verify Stripe session: " + e.getMessage());
        }

        if (session == null) {
            throw new IllegalArgumentException("Stripe session was not found.");
        }

        if (!"complete".equalsIgnoreCase(session.getStatus())) {
            throw new IllegalArgumentException("Stripe checkout is not completed.");
        }

        if (!"paid".equalsIgnoreCase(session.getPaymentStatus())) {
            throw new IllegalArgumentException("Stripe payment is not marked as paid.");
        }

        Map<String, String> metadata = session.getMetadata();
        if (metadata == null || metadata.isEmpty()) {
            throw new IllegalArgumentException("Stripe session metadata is missing.");
        }

        String metadataUserId = metadata.get("userId");
        if (!String.valueOf(request.getUserId()).equals(metadataUserId)) {
            throw new IllegalArgumentException("Stripe session does not belong to this user.");
        }

        String expectedCartSignature = metadata.get("cartSignature");
        String metadataPromoCode = normalizePromoCode(metadata.get("promoCode"));
        if (!Objects.equals(metadataPromoCode, normalizedPromoCode)) {
            throw new IllegalArgumentException("Promo code does not match the paid Stripe session.");
        }

        String providedCartSignature = buildCartSignature(request.getItems(), normalizedPromoCode);
        if (!providedCartSignature.equals(expectedCartSignature)) {
            throw new IllegalArgumentException("Checkout cart does not match the paid Stripe session.");
        }

        CreateOrderRequest createOrderRequest = CreateOrderRequest.builder()
                .userId(request.getUserId())
                .items(request.getItems())
                .paymentMethod("ONLINE")
                .stripeSessionId(sessionId)
            .promoCode(normalizedPromoCode)
                .build();

        return orderService.createOrder(createOrderRequest);
    }

    private void ensureStripeConfigured() {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new IllegalArgumentException("Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.");
        }
        Stripe.apiKey = stripeSecretKey;
    }

    private String buildCartSignature(List<OrderItemRequest> items, String promoCode) {
        TreeMap<Long, Integer> canonicalItems = new TreeMap<>();

        for (OrderItemRequest item : items) {
            Long productId = Objects.requireNonNull(item.getProductId(), "Product id is required for Stripe checkout item.");
            Integer quantity = Objects.requireNonNull(item.getQuantity(), "Quantity is required for Stripe checkout item.");

            if (quantity < 1) {
                throw new IllegalArgumentException("Invalid quantity for product id " + productId);
            }

            canonicalItems.merge(productId, quantity, Integer::sum);
        }

        StringJoiner joiner = new StringJoiner(",");
        for (Map.Entry<Long, Integer> entry : canonicalItems.entrySet()) {
            joiner.add(entry.getKey() + ":" + entry.getValue());
        }

        joiner.add("promo:" + (promoCode == null ? "" : promoCode));

        return sha256Hex(joiner.toString());
    }

    private PromoCodeReward resolvePromoRewardForCheckout(Long userId, String promoCode) {
        if (promoCode == null) {
            return null;
        }

        PromoCodeReward reward = promoCodeRewardRepository.findByPromoCode(promoCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid promo code."));

        if (!userId.equals(reward.getUserId())) {
            throw new IllegalArgumentException("This promo code does not belong to this user.");
        }

        if (reward.isUsed()) {
            throw new IllegalArgumentException("This promo code has already been used.");
        }

        if (reward.getDiscountPercent() == null || reward.getDiscountPercent() <= 0) {
            throw new IllegalArgumentException("Promo code is not valid for discounts.");
        }

        return reward;
    }

    private String normalizePromoCode(String promoCode) {
        if (promoCode == null || promoCode.isBlank()) {
            return null;
        }

        return promoCode.trim().toUpperCase(Locale.ROOT);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexBuilder = new StringBuilder(hash.length * 2);

            for (byte b : hash) {
                hexBuilder.append(String.format("%02x", b));
            }

            return hexBuilder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }

    private long toCents(BigDecimal amount) {
        return amount
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }
}
