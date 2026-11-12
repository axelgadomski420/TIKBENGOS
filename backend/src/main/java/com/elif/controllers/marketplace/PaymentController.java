package com.elif.controllers.marketplace;

import com.elif.dto.marketplace.StripeCheckoutRequest;
import com.elif.dto.marketplace.StripeCheckoutResponse;
import com.elif.dto.marketplace.StripeConfirmOrderRequest;
import com.elif.services.marketplace.StripePaymentService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/payment")
@AllArgsConstructor
public class PaymentController {

    private final StripePaymentService stripePaymentService;

    @PostMapping("/stripe/checkout-session")
    ResponseEntity<?> createStripeCheckoutSession(@RequestBody StripeCheckoutRequest request) {
        try {
            StripeCheckoutResponse response = stripePaymentService.createCheckoutSession(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/stripe/confirm-order")
    ResponseEntity<?> confirmStripeOrder(@RequestBody StripeConfirmOrderRequest request) {
        try {
            return ResponseEntity.ok(stripePaymentService.confirmPaidOrder(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
