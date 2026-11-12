package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.TravelDestinationCreateRequest;
import com.elif.dto.pet_transit.request.TravelDestinationUpdateRequest;
import com.elif.dto.pet_transit.response.TravelDestinationResponse;
import com.elif.dto.pet_transit.response.TravelDestinationSummaryResponse;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.services.pet_transit.TravelDestinationService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/destinations")
@AllArgsConstructor
public class TravelDestinationController {

    private final TravelDestinationService travelDestinationService;

    @GetMapping
    public Page<TravelDestinationSummaryResponse> getPublishedDestinations(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelDestinationService.getPublishedDestinations(search, startDate, endDate, page, size);
    }

    // PUBLIC: only published destinations
    @GetMapping("/{id}")
    public TravelDestinationResponse getDestinationById(@PathVariable Long id) {
        return travelDestinationService.getById(id);
    }

    // ADMIN: all destinations
    @GetMapping("/admin/all")
    public Page<TravelDestinationResponse> getAllDestinations(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) DestinationStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size) {
        return travelDestinationService.getAllDestinations(adminId, status, search, startDate, endDate, page, size);
    }

    @GetMapping("/admin/{id}")
    public TravelDestinationResponse getAdminDestinationById(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelDestinationService.getAdminById(id, adminId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public TravelDestinationResponse createDestination(
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestPart("request") TravelDestinationCreateRequest request,
            @RequestPart(value = "coverImageFile", required = false) MultipartFile coverImageFile,
            @RequestPart(value = "carouselImages", required = false) List<MultipartFile> carouselImageFiles) {
        return travelDestinationService.createDestination(adminId, request, coverImageFile, carouselImageFiles);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TravelDestinationResponse updateDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestPart("request") TravelDestinationUpdateRequest request,
            @RequestPart(value = "coverImageFile", required = false) MultipartFile coverImageFile,
            @RequestPart(value = "carouselImages", required = false) List<MultipartFile> carouselImageFiles) {
        return travelDestinationService.updateDestination(id, adminId, request, coverImageFile, carouselImageFiles);
    }

    @PostMapping("/{id}/publish")
    public TravelDestinationResponse publishDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelDestinationService.publishDestination(id, adminId);
    }

    @PostMapping("/{id}/schedule")
    public TravelDestinationResponse scheduleDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledAt) {
        return travelDestinationService.scheduleDestination(id, adminId, scheduledAt);
    }

    @PostMapping("/{id}/archive")
    public TravelDestinationResponse archiveDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelDestinationService.archiveDestination(id, adminId);
    }

    @PostMapping("/{id}/unarchive")
    public TravelDestinationResponse unarchiveDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        return travelDestinationService.unarchiveDestination(id, adminId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDestination(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long adminId) {
        travelDestinationService.deleteDestination(id, adminId);
    }

    @DeleteMapping("/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCarouselImage(@PathVariable Long imageId) {
        travelDestinationService.deleteCarouselImage(imageId);
    }
}
