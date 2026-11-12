package com.elif.services.marketplace;

import com.elif.dto.marketplace.ReclamationDTO;
import com.elif.entities.marketplace.MarketplaceReclamation;
import com.elif.entities.marketplace.Order;
import com.elif.repositories.marketplace.MarketplaceReclamationRepository;
import com.elif.repositories.marketplace.OrderRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class MarketplaceReclamationService implements IMarketplaceReclamationService {

    private final MarketplaceReclamationRepository reclamationRepository;
    private final OrderRepository orderRepository;

    @Override
    @Transactional
    public ReclamationDTO createReclamation(ReclamationDTO request, MultipartFile image) {
        validateRequest(request);

        Order order = findOrderForRequest(request);
        validateOrderProduct(order, request.getProductId());

        MarketplaceReclamation reclamation = MarketplaceReclamation.builder()
                .userId(request.getUserId())
                .orderId(request.getOrderId())
                .productId(request.getProductId())
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .image(resolveImageBytes(request.getImage(), image))
                .type(resolveType(request.getType()))
                .status(MarketplaceReclamation.ReclamationStatus.OPEN)
                .build();

        return mapToResponse(reclamationRepository.save(reclamation));
    }

    @Override
    @Transactional
    public ReclamationDTO updateReclamation(Long id, ReclamationDTO request, MultipartFile image) {
        validateRequest(request);

        MarketplaceReclamation reclamation = reclamationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reclamation not found"));

        Order order = findOrderForRequest(request);
        validateOrderProduct(order, request.getProductId());

        byte[] imageBytes = resolveImageBytes(request.getImage(), image);

        reclamation.setUserId(request.getUserId());
        reclamation.setOrderId(request.getOrderId());
        reclamation.setProductId(request.getProductId());
        reclamation.setTitle(request.getTitle().trim());
        reclamation.setDescription(request.getDescription().trim());
        reclamation.setType(resolveType(request.getType()));
        if (imageBytes != null) {
            reclamation.setImage(imageBytes);
        }

        return mapToResponse(reclamationRepository.save(reclamation));
    }

    @Override
    public ReclamationDTO getById(Long id) {
        return mapToResponse(findReclamation(id));
    }

    @Override
    public List<ReclamationDTO> getByUserId(Long userId) {
        return reclamationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public List<ReclamationDTO> getAll() {
        return reclamationRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public ReclamationDTO updateStatus(Long id, String status, String responseMalek) {
        MarketplaceReclamation reclamation = findReclamation(id);

        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        MarketplaceReclamation.ReclamationStatus targetStatus;
        try {
            targetStatus = MarketplaceReclamation.ReclamationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status. Allowed: OPEN, IN_REVIEW, RESOLVED, REJECTED");
        }

        reclamation.setStatus(targetStatus);
        reclamation.setResponseMalek(responseMalek == null ? null : responseMalek.trim());

        if (targetStatus == MarketplaceReclamation.ReclamationStatus.RESOLVED
                || targetStatus == MarketplaceReclamation.ReclamationStatus.REJECTED) {
            reclamation.setResolvedAt(LocalDateTime.now());
        } else {
            reclamation.setResolvedAt(null);
        }

        return mapToResponse(reclamationRepository.save(reclamation));
    }

    private void validateRequest(ReclamationDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Reclamation data is required");
        }
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID is required");
        }
        if (request.getOrderId() == null) {
            throw new IllegalArgumentException("Order ID is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new IllegalArgumentException("Description is required");
        }
    }

    private Order findOrderForRequest(ReclamationDTO request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!Objects.equals(order.getUserId(), request.getUserId())) {
            throw new IllegalArgumentException("Order does not belong to this user");
        }

        return order;
    }

    private void validateOrderProduct(Order order, Long productId) {
        if (productId == null) {
            return;
        }

        if (order.getOrderItems() == null) {
            throw new IllegalArgumentException("Selected product is not part of this order");
        }

        boolean productInOrder = order.getOrderItems().stream()
                .anyMatch(item -> Objects.equals(item.getProductId(), productId));
        if (!productInOrder) {
            throw new IllegalArgumentException("Selected product is not part of this order");
        }
    }

    private MarketplaceReclamation findReclamation(Long id) {
        return reclamationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reclamation not found"));
    }

    private MarketplaceReclamation.ReclamationType resolveType(String type) {
        if (type == null || type.isBlank()) {
            return MarketplaceReclamation.ReclamationType.OTHER;
        }

        try {
            return MarketplaceReclamation.ReclamationType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return MarketplaceReclamation.ReclamationType.OTHER;
        }
    }

    private byte[] resolveImageBytes(String base64Image, MultipartFile image) {
        try {
            if (image != null && !image.isEmpty()) {
                return image.getBytes();
            }

            if (base64Image == null || base64Image.isBlank()) {
                return null;
            }

            return Base64.getDecoder().decode(stripDataUrlPrefix(base64Image));
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read reclamation image", e);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid base64 image content", e);
        }
    }

    private String stripDataUrlPrefix(String value) {
        int commaIndex = value.indexOf(',');
        if (commaIndex >= 0 && value.substring(0, commaIndex).contains("base64")) {
            return value.substring(commaIndex + 1);
        }

        return value;
    }

    private ReclamationDTO mapToResponse(MarketplaceReclamation reclamation) {
        return ReclamationDTO.builder()
                .id(reclamation.getId())
                .userId(reclamation.getUserId())
                .orderId(reclamation.getOrderId())
                .productId(reclamation.getProductId())
                .title(reclamation.getTitle())
                .description(reclamation.getDescription())
                .type(reclamation.getType().name())
                .status(reclamation.getStatus().name())
                .responseMalek(reclamation.getResponseMalek())
                .resolvedAt(reclamation.getResolvedAt())
                .createdAt(reclamation.getCreatedAt())
                .updatedAt(reclamation.getUpdatedAt())
                .image(encodeImage(reclamation.getImage()))
                .build();
    }

    private String encodeImage(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return null;
        }

        return Base64.getEncoder().encodeToString(imageBytes);
    }
}
