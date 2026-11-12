package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.TravelDestinationCreateRequest;
import com.elif.dto.pet_transit.request.TravelDestinationUpdateRequest;
import com.elif.dto.pet_transit.response.TravelDestinationResponse;
import com.elif.dto.pet_transit.response.TravelDestinationSummaryResponse;
import com.elif.dto.pet_transit.response.DestinationImageResponse;
import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.TravelDestinationImage;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.exceptions.pet_transit.TravelDestinationNotFoundException;
import com.elif.exceptions.pet_transit.UnauthorizedTravelAccessException;
import com.elif.repositories.pet_transit.TravelDestinationRepository;
import com.elif.repositories.pet_transit.TravelDestinationImageRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.elif.repositories.pet_transit.specifications.TravelDestinationSpecifications;
import com.elif.repositories.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
@Transactional
public class TravelDestinationService {

    private final TravelDestinationRepository travelDestinationRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final TravelDestinationImageRepository imageRepository;

    // --------------------- Creation & Update ---------------------

    public TravelDestinationResponse createDestination(Long adminId, TravelDestinationCreateRequest req, MultipartFile coverImageFile, List<MultipartFile> carouselImageFiles) {
        getAdminUser(adminId);

        Set<DocumentType> requiredDocs = req.getRequiredDocuments() != null
                ? req.getRequiredDocuments()
                : new HashSet<>();

        String coverImageUrl = req.getCoverImageUrl();
        if (coverImageFile != null && !coverImageFile.isEmpty()) {
            coverImageUrl = fileStorageService.storeDestinationCover(coverImageFile);
        }

        TravelDestination destination = TravelDestination.builder()
                .title(req.getTitle())
                .country(req.getCountry())
                .region(req.getRegion())
                .destinationType(req.getDestinationType())
                .recommendedTransportType(req.getRecommendedTransportType())
                .petFriendlyLevel(req.getPetFriendlyLevel())
                .description(req.getDescription())
                .safetyTips(req.getSafetyTips())
                .requiredDocuments(requiredDocs)
                .coverImageUrl(coverImageUrl)
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .status(DestinationStatus.DRAFT)
                .build();

        TravelDestination saved = travelDestinationRepository.save(destination);

        if (carouselImageFiles != null && !carouselImageFiles.isEmpty()) {
            saveCarouselImages(saved, carouselImageFiles);
        }

        return toResponse(saved);
    }

    public TravelDestinationResponse updateDestination(Long id, Long adminId, TravelDestinationUpdateRequest req, MultipartFile coverImageFile, List<MultipartFile> carouselImageFiles) {
        getAdminUser(adminId);

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        String previousCoverImageUrl = destination.getCoverImageUrl();

        if (req.getTitle() != null) {
            destination.setTitle(req.getTitle());
        }
        if (req.getCountry() != null) {
            destination.setCountry(req.getCountry());
        }
        if (req.getRegion() != null) {
            destination.setRegion(req.getRegion());
        }
        if (req.getDestinationType() != null) {
            destination.setDestinationType(req.getDestinationType());
        }
        if (req.getRecommendedTransportType() != null) {
            destination.setRecommendedTransportType(req.getRecommendedTransportType());
        }
        if (req.getPetFriendlyLevel() != null) {
            destination.setPetFriendlyLevel(req.getPetFriendlyLevel());
        }
        if (req.getDescription() != null) {
            destination.setDescription(req.getDescription());
        }
        if (req.getSafetyTips() != null) {
            destination.setSafetyTips(req.getSafetyTips());
        }
        if (req.getRequiredDocuments() != null) {
            destination.setRequiredDocuments(req.getRequiredDocuments());
        }
        if (req.getCoverImageUrl() != null) {
            destination.setCoverImageUrl(req.getCoverImageUrl());
        }

        if (coverImageFile != null && !coverImageFile.isEmpty()) {
            String newCoverImageUrl = fileStorageService.storeDestinationCover(coverImageFile);
            destination.setCoverImageUrl(newCoverImageUrl);

            if (previousCoverImageUrl != null && previousCoverImageUrl.startsWith("/uploads/")) {
                fileStorageService.deleteFile(previousCoverImageUrl);
            }
        }
        if (req.getLatitude() != null) {
            destination.setLatitude(req.getLatitude());
        }
        if (req.getLongitude() != null) {
            destination.setLongitude(req.getLongitude());
        }

        TravelDestination updated = travelDestinationRepository.save(destination);

        if (req.isReplaceCarouselImages() && carouselImageFiles != null && !carouselImageFiles.isEmpty()) {
            List<TravelDestinationImage> oldImages = imageRepository.findByDestinationIdOrderByDisplayOrderAsc(id);
            for (TravelDestinationImage img : oldImages) {
                fileStorageService.deleteFile(img.getImageUrl());
            }
            imageRepository.deleteByDestinationId(id);
            saveCarouselImages(updated, carouselImageFiles);
        }

        return toResponse(updated);
    }

    // --------------------- Status transitions ---------------------

    public TravelDestinationResponse publishDestination(Long id, Long adminId) {
        getAdminUser(adminId);

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        destination.setStatus(DestinationStatus.PUBLISHED);
        destination.setPublishedAt(LocalDateTime.now());
        destination.setScheduledPublishAt(null);

        TravelDestination updated = travelDestinationRepository.save(destination);
        return toResponse(updated);
    }

    public TravelDestinationResponse scheduleDestination(Long id, Long adminId, LocalDateTime scheduledAt) {
        getAdminUser(adminId);

        if (scheduledAt == null) {
            throw new IllegalArgumentException("scheduledAt is required");
        }

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        destination.setStatus(DestinationStatus.SCHEDULED);
        destination.setScheduledPublishAt(scheduledAt);

        TravelDestination updated = travelDestinationRepository.save(destination);
        return toResponse(updated);
    }

    public TravelDestinationResponse archiveDestination(Long id, Long adminId) {
        getAdminUser(adminId);

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        if (destination.getStatus() != DestinationStatus.ARCHIVED) {
            destination.setPreviousStatusBeforeArchive(destination.getStatus());
        }

        destination.setStatus(DestinationStatus.ARCHIVED);

        TravelDestination updated = travelDestinationRepository.save(destination);
        return toResponse(updated);
    }

    public TravelDestinationResponse unarchiveDestination(Long id, Long adminId) {
        getAdminUser(adminId);

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        if (destination.getStatus() != DestinationStatus.ARCHIVED) {
            throw new IllegalStateException("Only archived destinations can be unarchived");
        }

        DestinationStatus previousStatus = destination.getPreviousStatusBeforeArchive();

        if (previousStatus == null) {
            previousStatus = DestinationStatus.DRAFT;
        }

        LocalDateTime now = LocalDateTime.now();

        switch (previousStatus) {
            case DRAFT -> {
                destination.setStatus(DestinationStatus.DRAFT);
            }

            case PUBLISHED -> {
                destination.setStatus(DestinationStatus.PUBLISHED);
                if (destination.getPublishedAt() == null) {
                    destination.setPublishedAt(now);
                }
                destination.setScheduledPublishAt(null);
            }

            case SCHEDULED -> {
                if (destination.getScheduledPublishAt() != null && destination.getScheduledPublishAt().isAfter(now)) {
                    destination.setStatus(DestinationStatus.SCHEDULED);
                } else {
                    destination.setStatus(DestinationStatus.PUBLISHED);
                    destination.setPublishedAt(now);
                    destination.setScheduledPublishAt(null);
                }
            }

            case ARCHIVED -> {
                destination.setStatus(DestinationStatus.DRAFT);
            }
        }

        destination.setPreviousStatusBeforeArchive(null);

        TravelDestination updated = travelDestinationRepository.save(destination);
        return toResponse(updated);
    }

    public void deleteDestination(Long id, Long adminId) {
        getAdminUser(adminId);

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        List<TravelPlan> linkedPlans = travelPlanRepository.findByDestinationId(id);
        if (!linkedPlans.isEmpty()) {
            throw new IllegalStateException(
                "Cannot delete destination — " + linkedPlans.size() + " travel plans are linked to it."
            );
        }

        travelDestinationRepository.delete(destination);
    }

    // --------------------- Reading with auto-publish ---------------------

    public void publishDueScheduledDestinations() {
        LocalDateTime now = LocalDateTime.now();

        List<TravelDestination> dueDestinations =
                travelDestinationRepository.findByStatusAndScheduledPublishAtLessThanEqual(
                        DestinationStatus.SCHEDULED,
                        now
                );

        for (TravelDestination destination : dueDestinations) {
            destination.setStatus(DestinationStatus.PUBLISHED);
            destination.setPublishedAt(now);
            destination.setScheduledPublishAt(null);
        }

        if (!dueDestinations.isEmpty()) {
            travelDestinationRepository.saveAll(dueDestinations);
        }
    }

    public Page<TravelDestinationSummaryResponse> getPublishedDestinations() {
        return getPublishedDestinations(null, null, null, 0, 1000);
    }

    public Page<TravelDestinationSummaryResponse> getPublishedDestinations(
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        publishDueScheduledDestinations();

        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelDestination> specification = TravelDestinationSpecifications.byFilters(
                DestinationStatus.PUBLISHED,
                search,
                normalizedStartDate,
                normalizedEndDate
        );

        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return travelDestinationRepository.findAll(specification, pageable)
            .map(this::toSummaryResponse);
    }

        public Page<TravelDestinationResponse> getAllDestinations(Long adminId) {
        return getAllDestinations(adminId, null, null, null, null, 0, 1000);
    }

        public Page<TravelDestinationResponse> getAllDestinations(
            Long adminId,
            DestinationStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate,
            int page,
            int size
    ) {
        getAdminUser(adminId);
        publishDueScheduledDestinations();

        LocalDate normalizedStartDate = normalizeStartDate(startDate, endDate);
        LocalDate normalizedEndDate = normalizeEndDate(startDate, endDate);

        Specification<TravelDestination> specification = TravelDestinationSpecifications.byFilters(
                status,
                search,
                normalizedStartDate,
                normalizedEndDate
        );

        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return travelDestinationRepository.findAll(specification, pageable)
            .map(this::toResponse);
    }

    public TravelDestinationResponse getById(Long id) {
        publishDueScheduledDestinations();

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        if (destination.getStatus() != DestinationStatus.PUBLISHED) {
            throw new TravelDestinationNotFoundException("Published destination not found with id: " + id);
        }

        return toResponse(destination);
    }

    public TravelDestinationResponse getAdminById(Long id, Long adminId) {
        getAdminUser(adminId);
        publishDueScheduledDestinations();

        TravelDestination destination = travelDestinationRepository.findById(id)
                .orElseThrow(() -> new TravelDestinationNotFoundException("Destination not found with id: " + id));

        return toResponse(destination);
    }

    // --------------------- Helper methods ---------------------

    private User getAdminUser(Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedTravelAccessException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTravelAccessException("User " + adminId + " is not an admin");
        }

        return admin;
    }

    private void saveCarouselImages(TravelDestination destination, List<MultipartFile> files) {
        List<TravelDestinationImage> images = new ArrayList<>();
        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            if (file != null && !file.isEmpty()) {
                String imageUrl = fileStorageService.storeFile(file, "destinations/carousel");
                TravelDestinationImage image = TravelDestinationImage.builder()
                        .destination(destination)
                        .imageUrl(imageUrl)
                        .displayOrder(i)
                        .build();
                images.add(image);
            }
        }
        if (!images.isEmpty()) {
            imageRepository.saveAll(images);
        }
    }

    public void deleteCarouselImage(Long imageId) {
        TravelDestinationImage image = imageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Carousel image not found with id: " + imageId));
        fileStorageService.deleteFile(image.getImageUrl());
        imageRepository.delete(image);
    }

    private TravelDestinationResponse toResponse(TravelDestination destination) {
        Set<String> requiredDocs = destination.getRequiredDocuments() != null
                ? destination.getRequiredDocuments().stream()
                .map(Enum::name)
                .collect(Collectors.toSet())
                : new HashSet<>();

        List<DestinationImageResponse> carouselImages = imageRepository
                .findByDestinationIdOrderByDisplayOrderAsc(destination.getId())
                .stream()
                .map(img -> DestinationImageResponse.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .displayOrder(img.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());

        return TravelDestinationResponse.builder()
                .id(destination.getId())
                .title(destination.getTitle())
                .country(destination.getCountry())
                .region(destination.getRegion())
                .destinationType(destination.getDestinationType())
                .recommendedTransportType(destination.getRecommendedTransportType())
                .petFriendlyLevel(destination.getPetFriendlyLevel())
                .description(destination.getDescription())
                .safetyTips(destination.getSafetyTips())
                .requiredDocuments(requiredDocs)
                .coverImageUrl(destination.getCoverImageUrl())
                .carouselImages(carouselImages)
                .latitude(destination.getLatitude())
                .longitude(destination.getLongitude())
                .linkedPlansCount(travelPlanRepository.findByDestinationId(destination.getId()).size())
                .status(destination.getStatus())
                .previousStatusBeforeArchive(destination.getPreviousStatusBeforeArchive())
                .scheduledPublishAt(destination.getScheduledPublishAt())
                .publishedAt(destination.getPublishedAt())
                .createdAt(destination.getCreatedAt())
                .updatedAt(destination.getUpdatedAt())
                .build();
    }

    private TravelDestinationSummaryResponse toSummaryResponse(TravelDestination destination) {
        return TravelDestinationSummaryResponse.builder()
                .id(destination.getId())
                .title(destination.getTitle())
                .country(destination.getCountry())
                .region(destination.getRegion())
                .destinationType(destination.getDestinationType())
                .recommendedTransportType(destination.getRecommendedTransportType())
                .petFriendlyLevel(destination.getPetFriendlyLevel())
                .coverImageUrl(destination.getCoverImageUrl())
                .status(destination.getStatus())
                .build();
    }

    private LocalDate normalizeStartDate(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return endDate;
        }
        return startDate;
    }

    private LocalDate normalizeEndDate(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            return startDate;
        }
        return endDate;
    }
}
