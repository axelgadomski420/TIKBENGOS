package com.elif.services.marketplace;

import com.elif.dto.marketplace.*;
import com.elif.entities.marketplace.Order;
import com.elif.entities.marketplace.OrderItem;
import com.elif.entities.marketplace.PromoCodeReward;
import com.elif.entities.marketplace.Product;
import com.elif.repositories.marketplace.OrderRepository;
import com.elif.repositories.marketplace.PromoCodeRewardRepository;
import com.elif.repositories.marketplace.ProductRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
@AllArgsConstructor
@Slf4j
public class OrderService implements IOrderService {

    private static final BigDecimal PROMO_MILESTONE_AMOUNT = new BigDecimal("200.00");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final int PROMO_DISCOUNT_PERCENT = 20;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PromoCodeRewardRepository promoCodeRewardRepository;
    private final PromoCodeEmailService promoCodeEmailService;
    private final OrderInvoiceEmailService orderInvoiceEmailService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        if (request.getUserId() == null || request.getUserId() <= 0) {
            throw new IllegalArgumentException("Valid user id is required");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }

        Order.PaymentMethod paymentMethod = resolvePaymentMethod(request.getPaymentMethod());

        BigDecimal subtotalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        List<Product> updatedProducts = new ArrayList<>();

        Order order = Order.builder()
                .userId(request.getUserId())
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .stripeSessionId(normalizeStripeSessionId(request.getStripeSessionId(), paymentMethod))
                .orderItems(orderItems)
                .build();

        for (OrderItemRequest itemRequest : request.getItems()) {
            if (itemRequest.getProductId() == null || itemRequest.getQuantity() == null || itemRequest.getQuantity() <= 0) {
                throw new IllegalArgumentException("Each order item must include a valid product id and quantity > 0");
            }

            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Product not found: " + itemRequest.getProductId()));

            if (product.getStock() < itemRequest.getQuantity()) {
                throw new IllegalArgumentException(
                        "Insufficient stock for product: " + product.getName());
            }

            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .productId(product.getId())
                    .productName(product.getName())
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(product.getPrice())
                    .subtotal(subtotal)
                    .build();

            orderItems.add(orderItem);
            subtotalAmount = subtotalAmount.add(subtotal);

            // Reduce stock
            product.setStock(product.getStock() - itemRequest.getQuantity());
            updatedProducts.add(product);
        }

        String normalizedPromoCode = normalizePromoCode(request.getPromoCode());
        PromoCodeReward promoReward = resolvePromoReward(request.getUserId(), normalizedPromoCode);
        BigDecimal discountAmount = resolveDiscountAmount(subtotalAmount, promoReward);
        BigDecimal finalAmount = subtotalAmount.subtract(discountAmount).setScale(2, RoundingMode.HALF_UP);
        if (finalAmount.compareTo(BigDecimal.ZERO) < 0) {
            finalAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal previousPurchasedAmount = resolvePurchasedAmount(request.getUserId());

        productRepository.saveAll(updatedProducts);

        order.setPromoCodeUsed(promoReward == null ? null : promoReward.getPromoCode());
        order.setDiscountAmount(discountAmount);
        order.setTotalAmount(finalAmount);
        Order saved = orderRepository.save(order);

        if (promoReward != null) {
            promoReward.setUsed(true);
            promoCodeRewardRepository.save(promoReward);
        }

        List<PromoCodeReward> awardedRewards = awardPromoCodesIfSpendMilestoneReached(
                request.getUserId(),
                saved.getId(),
                previousPurchasedAmount,
                finalAmount
        );

        List<String> awardedPromoCodes = awardedRewards.stream()
                .map(PromoCodeReward::getPromoCode)
                .toList();

        if (!awardedRewards.isEmpty()) {
            promoCodeEmailService.sendPromoCodeUnlockedEmail(
                    request.getUserId(),
                    awardedRewards,
                    PROMO_DISCOUNT_PERCENT,
                    PROMO_MILESTONE_AMOUNT
            );
        }

        OrderResponse response = mapToResponse(saved, awardedPromoCodes);

        try {
            eventPublisher.publishEvent(new OrderInvoiceRequestedEvent(saved.getId()));
        } catch (Exception ex) {
            log.warn("Order {} created but invoice event could not be published: {}", saved.getId(), ex.getMessage());
        }

        return response;
    }

    @Override
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return mapToResponse(order);
    }

    @Override
    public List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public OrderResponse confirmOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalArgumentException("Only pending orders can be confirmed");
        }

        order.setStatus(Order.OrderStatus.CONFIRMED);
        Order updated = orderRepository.save(order);

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getStatus() == Order.OrderStatus.DELIVERED ||
                order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot cancel this order");
        }

        // Restore stock
        for (OrderItem item : order.getOrderItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found"));
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        Order updated = orderRepository.save(order);

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        Order.OrderStatus targetStatus;
        try {
            targetStatus = Order.OrderStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status. Allowed values: PENDING, CONFIRMED, SHIPPED, CANCELLED");
        }

        if (order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Cancelled orders cannot be updated");
        }

        if (targetStatus != Order.OrderStatus.PENDING
                && targetStatus != Order.OrderStatus.CONFIRMED
                && targetStatus != Order.OrderStatus.SHIPPED
                && targetStatus != Order.OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Only PENDING, CONFIRMED, SHIPPED or CANCELLED can be set from admin dashboard");
        }

        if (order.getStatus() == targetStatus) {
            return mapToResponse(order);
        }

        if (order.getStatus() == Order.OrderStatus.PENDING && targetStatus == Order.OrderStatus.CONFIRMED) {
            order.setStatus(Order.OrderStatus.CONFIRMED);
        } else if (order.getStatus() == Order.OrderStatus.CONFIRMED && targetStatus == Order.OrderStatus.PENDING) {
            order.setStatus(Order.OrderStatus.PENDING);
        } else if (order.getStatus() == Order.OrderStatus.CONFIRMED && targetStatus == Order.OrderStatus.SHIPPED) {
            order.setStatus(Order.OrderStatus.SHIPPED);
        } else if ((order.getStatus() == Order.OrderStatus.PENDING || order.getStatus() == Order.OrderStatus.CONFIRMED)
                && targetStatus == Order.OrderStatus.CANCELLED) {
            // Restore stock when cancelling through the admin status endpoint.
            for (OrderItem item : order.getOrderItems()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new IllegalArgumentException("Product not found"));
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);
            }
            order.setStatus(Order.OrderStatus.CANCELLED);
        } else {
            throw new IllegalArgumentException("Unsupported status transition");
        }

        Order updated = orderRepository.save(order);
        return mapToResponse(updated);
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    private OrderResponse mapToResponse(Order order) {
        return mapToResponse(order, Collections.emptyList());
    }

    private OrderResponse mapToResponse(Order order, List<String> awardedPromoCodes) {
        List<OrderItemResponse> itemResponses = order.getOrderItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .subtotal(item.getSubtotal())
                        .build())
                .toList();

        List<String> safeCodes = awardedPromoCodes == null ? Collections.emptyList() : awardedPromoCodes;
        String promoMessage = safeCodes.isEmpty()
                ? null
                : "Congrats! You unlocked " + safeCodes.size() + " promo code" + (safeCodes.size() > 1 ? "s" : "")
            + " after crossing a $" + PROMO_MILESTONE_AMOUNT.toPlainString() + " purchase milestone."
            + " Check your email for details.";

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .status(order.getStatus().toString())
                .paymentMethod((order.getPaymentMethod() == null ? Order.PaymentMethod.CASH : order.getPaymentMethod()).toString())
                .totalAmount(order.getTotalAmount())
                .discountAmount(order.getDiscountAmount())
                .appliedPromoCode(order.getPromoCodeUsed())
                .createdAt(order.getCreatedAt())
                .orderItems(itemResponses)
                .awardedPromoCodes(safeCodes)
                .promoMessage(promoMessage)
                .build();
    }

    private String normalizePromoCode(String promoCode) {
        if (promoCode == null || promoCode.isBlank()) {
            return null;
        }

        return promoCode.trim().toUpperCase(Locale.ROOT);
    }

    private PromoCodeReward resolvePromoReward(Long userId, String promoCode) {
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

    private BigDecimal resolveDiscountAmount(BigDecimal subtotalAmount, PromoCodeReward reward) {
        if (reward == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal rate = BigDecimal.valueOf(reward.getDiscountPercent())
                .divide(HUNDRED, 4, RoundingMode.HALF_UP);

        BigDecimal discount = subtotalAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        if (discount.compareTo(subtotalAmount) > 0) {
            return subtotalAmount.setScale(2, RoundingMode.HALF_UP);
        }

        return discount;
    }

    private BigDecimal resolvePurchasedAmount(Long userId) {
        BigDecimal result = orderRepository.sumPurchasedAmountByUserIdAndStatusNot(userId, Order.OrderStatus.CANCELLED);
        if (result == null || result.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }

        return result;
    }

    private List<PromoCodeReward> awardPromoCodesIfSpendMilestoneReached(
            Long userId,
            Long orderId,
            BigDecimal previousPurchasedAmount,
            BigDecimal purchasedAmountInOrder
    ) {
        int previousMilestone = milestoneIndex(previousPurchasedAmount);
        int currentMilestone = milestoneIndex(previousPurchasedAmount.add(purchasedAmountInOrder));

        if (currentMilestone <= previousMilestone) {
            return Collections.emptyList();
        }

        List<PromoCodeReward> rewards = new ArrayList<>();

        for (int milestone = previousMilestone + 1; milestone <= currentMilestone; milestone++) {
            BigDecimal milestoneAmount = PROMO_MILESTONE_AMOUNT.multiply(BigDecimal.valueOf(milestone));
            String promoCode = generateUniquePromoCode(userId, milestoneAmount);

            PromoCodeReward reward = PromoCodeReward.builder()
                    .userId(userId)
                    .orderId(orderId)
                    .promoCode(promoCode)
                    .milestoneAmount(milestoneAmount)
                    .discountPercent(PROMO_DISCOUNT_PERCENT)
                    .used(false)
                    .build();

            rewards.add(promoCodeRewardRepository.save(reward));
        }

        return rewards;
    }

    private int milestoneIndex(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        return amount.divideToIntegralValue(PROMO_MILESTONE_AMOUNT).intValue();
    }

    private String generateUniquePromoCode(Long userId, BigDecimal milestoneAmount) {
        String milestoneToken = milestoneAmount.setScale(0, RoundingMode.DOWN).toPlainString();
        String base = "ELIF" + PROMO_DISCOUNT_PERCENT + "-U" + userId + "-S" + milestoneToken;

        for (int attempt = 0; attempt < 20; attempt++) {
            String suffix = randomSuffix(4);
            String candidate = base + "-" + suffix;
            if (!promoCodeRewardRepository.existsByPromoCode(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("Unable to generate a unique promo code. Please retry order placement.");
    }

    private String randomSuffix(int length) {
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder builder = new StringBuilder(length);
        ThreadLocalRandom random = ThreadLocalRandom.current();

        for (int i = 0; i < length; i++) {
            builder.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }

        return builder.toString().toUpperCase(Locale.ROOT);
    }

    private Order.PaymentMethod resolvePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return Order.PaymentMethod.CASH;
        }

        try {
            return Order.PaymentMethod.valueOf(paymentMethod.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid payment method. Use CASH or ONLINE");
        }
    }

    private String normalizeStripeSessionId(String stripeSessionId, Order.PaymentMethod paymentMethod) {
        if (stripeSessionId == null || stripeSessionId.isBlank()) {
            return null;
        }

        if (paymentMethod != Order.PaymentMethod.ONLINE) {
            throw new IllegalArgumentException("Stripe session id can only be set for ONLINE payments");
        }

        return stripeSessionId.trim();
    }
}
