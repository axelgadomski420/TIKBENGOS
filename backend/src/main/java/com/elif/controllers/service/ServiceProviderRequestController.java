package com.elif.controllers.service;

import com.elif.dto.service.ServiceProviderRequestDTO;
import com.elif.exceptions.ResourceNotFoundException;
import com.elif.services.service.ServiceProviderRequestService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/provider-request")
@CrossOrigin(origins = "http://localhost:4200")
public class ServiceProviderRequestController {

    private final ServiceProviderRequestService requestService;

    public ServiceProviderRequestController(ServiceProviderRequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createRequest(
            @RequestParam("userId") Long userId,
            @RequestParam("fullName") String fullName,
            @RequestParam("email") String email,
            @RequestParam("phone") String phone,
            @RequestParam("description") String description,
            @RequestPart(value = "cv", required = false) MultipartFile cv) {
        try {
            ServiceProviderRequestDTO dto = requestService.createRequest(userId, fullName, email, phone, description, cv);
            return ResponseEntity.status(201).body(dto);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/me/{userId}")
    public ResponseEntity<?> getMyRequest(@PathVariable Long userId) {
        ServiceProviderRequestDTO dto = requestService.getRequestByUser(userId);
        if (dto == null) {
            return ResponseEntity.ok(Map.of("status", "NONE"));
        }
        return ResponseEntity.ok(dto);
    }

    @GetMapping
    public ResponseEntity<List<ServiceProviderRequestDTO>> getAllRequests() {
        return ResponseEntity.ok(requestService.getAllRequests());
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(requestService.approveRequest(id));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(requestService.rejectRequest(id));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/cv/{fileName:.+}")
    public ResponseEntity<Resource> downloadCV(@PathVariable String fileName, HttpServletRequest request) {
        Resource resource = requestService.loadFileAsResource(fileName);
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // Error when determining content type
        }

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }
}