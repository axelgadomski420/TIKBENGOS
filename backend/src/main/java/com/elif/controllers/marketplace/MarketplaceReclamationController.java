package com.elif.controllers.marketplace;

import com.elif.dto.marketplace.ReclamationDTO;
import com.elif.dto.marketplace.UpdateMarketplaceReclamationStatusRequest;
import com.elif.services.marketplace.IMarketplaceReclamationService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URLConnection;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/reclamations", "/marketplace-reclamation"})
@AllArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class MarketplaceReclamationController {

    private final IMarketplaceReclamationService marketplaceReclamationService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> create(
            @RequestPart("reclamation") ReclamationDTO reclamationDTO,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        try {
            ReclamationDTO created = marketplaceReclamationService.createReclamation(reclamationDTO, image);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return errorResponse(e);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create reclamation"));
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestPart("reclamation") ReclamationDTO reclamationDTO,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        try {
            return ResponseEntity.ok(marketplaceReclamationService.updateReclamation(id, reclamationDTO, image));
        } catch (IllegalArgumentException e) {
            return errorResponse(e);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update reclamation"));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReclamationDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(marketplaceReclamationService.getByUserId(userId));
    }

    @GetMapping
    public ResponseEntity<List<ReclamationDTO>> getAll() {
        return ResponseEntity.ok(marketplaceReclamationService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(marketplaceReclamationService.getById(id));
        } catch (IllegalArgumentException e) {
            return errorResponse(e);
        }
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id) {
        try {
            ReclamationDTO reclamation = marketplaceReclamationService.getById(id);
            if (reclamation.getImage() == null || reclamation.getImage().isBlank()) {
                return ResponseEntity.notFound().build();
            }

            byte[] imageBytes = Base64.getDecoder().decode(reclamation.getImage());
            String contentType = detectContentType(imageBytes);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(imageBytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody UpdateMarketplaceReclamationStatusRequest request
    ) {
        try {
            return ResponseEntity.ok(
                    marketplaceReclamationService.updateStatus(id, request.getStatus(), request.getResponseMalek())
            );
        } catch (IllegalArgumentException e) {
            return errorResponse(e);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update reclamation"));
        }
    }

    private ResponseEntity<Map<String, String>> errorResponse(IllegalArgumentException e) {
        String message = e.getMessage() == null ? "Request failed" : e.getMessage();
        if (message.toLowerCase().contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", message));
        }

        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    private String detectContentType(byte[] imageBytes) {
        if (imageBytes == null || imageBytes.length == 0) {
            return "application/octet-stream";
        }

        try {
            String detected = URLConnection.guessContentTypeFromStream(new ByteArrayInputStream(imageBytes));
            return detected == null || detected.isBlank() ? "application/octet-stream" : detected;
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }
}
