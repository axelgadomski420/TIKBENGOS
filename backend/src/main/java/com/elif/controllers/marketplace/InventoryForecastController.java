package com.elif.controllers.marketplace;

import com.elif.dto.marketplace.InventoryForecastReportResponse;
import com.elif.dto.marketplace.InventoryForecastRequest;
import com.elif.services.marketplace.IInventoryForecastService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/inventory-forecast")
@AllArgsConstructor
public class InventoryForecastController {

    private final IInventoryForecastService inventoryForecastService;

    @PostMapping("/report")
    ResponseEntity<?> generateForecastReport(@RequestBody(required = false) InventoryForecastRequest request) {
        try {
            InventoryForecastReportResponse response = inventoryForecastService.generateForecastReport(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
