package com.elif.services.service;

import com.elif.dto.service.ServiceDTO;
import com.elif.entities.service.Service;
import com.elif.entities.service.ServiceCategory;
import com.elif.entities.user.User;
import com.elif.exceptions.ResourceNotFoundException;
import com.elif.repositories.service.ServiceCategoryRepository;
import com.elif.repositories.service.ServiceRepository;
import com.elif.repositories.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.Comparator;
import java.util.ArrayList;
import com.elif.dto.service.RecommendedServiceDTO;
import com.elif.entities.service.ServiceBooking;
import com.elif.repositories.service.ServiceBookingRepository;

@org.springframework.stereotype.Service
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final UserRepository userRepository;
    private final ServiceProviderRequestService serviceProviderRequestService;
    private final ServiceBookingRepository serviceBookingRepository;

    public ServiceService(ServiceRepository serviceRepository,
            ServiceCategoryRepository serviceCategoryRepository,
            UserRepository userRepository,
            ServiceProviderRequestService serviceProviderRequestService,
            ServiceBookingRepository serviceBookingRepository) {
        this.serviceRepository = serviceRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.userRepository = userRepository;
        this.serviceProviderRequestService = serviceProviderRequestService;
        this.serviceBookingRepository = serviceBookingRepository;
    }

    public List<Service> getAll() {
        return serviceRepository.findAll();
    }

    public Service getById(Long id) {
        return serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found with id: " + id));
    }

    public Service create(Service service) {
        return serviceRepository.save(service);
    }

    public Service create(ServiceDTO serviceDTO) {
        ServiceCategory category = serviceCategoryRepository.findById(serviceDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ServiceCategory not found with id: " + serviceDTO.getCategoryId()));

        User provider = null;
        if (serviceDTO.getProviderId() != null) {
            provider = userRepository.findById(serviceDTO.getProviderId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "User not found with id: " + serviceDTO.getProviderId()));

            // Delegate to the single authoritative publish-gate:
            // requires BOTH RequestStatus.APPROVED and Role.SERVICE_PROVIDER.
            if (!serviceProviderRequestService.canPublish(provider.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Provider not approved by admin or role not elevated to SERVICE_PROVIDER");
            }
        }

        Service service = new Service();
        service.setName(serviceDTO.getName());
        service.setDescription(serviceDTO.getDescription());
        service.setPrice(serviceDTO.getPrice() == null ? 0d : serviceDTO.getPrice());
        service.setDuration(serviceDTO.getDuration() == null ? 0 : serviceDTO.getDuration());
        service.setStatus(serviceDTO.getStatus());
        service.setImageUrl(serviceDTO.getImageUrl());
        service.setCategory(category);
        service.setProvider(provider);
        service.setClinicName(serviceDTO.getClinicName());
        service.setConsultationType(serviceDTO.getConsultationType());
        service.setEmergencyAvailable(serviceDTO.getEmergencyAvailable());
        service.setRequiresAppointment(serviceDTO.getRequiresAppointment());

        service.setPetSize(serviceDTO.getPetSize());
        service.setIncludesBath(serviceDTO.getIncludesBath());
        service.setIncludesHaircut(serviceDTO.getIncludesHaircut());
        service.setProductsUsed(serviceDTO.getProductsUsed());

        service.setTrainingType(serviceDTO.getTrainingType());
        service.setSessionsCount(serviceDTO.getSessionsCount());
        service.setSessionDuration(serviceDTO.getSessionDuration());
        service.setGroupTraining(serviceDTO.getGroupTraining());

        service.setCapacity(serviceDTO.getCapacity());
        service.setOvernight(serviceDTO.getOvernight());
        service.setHasOutdoorSpace(serviceDTO.getHasOutdoorSpace());
        service.setMaxStayDays(serviceDTO.getMaxStayDays());

        service.setRoomType(serviceDTO.getRoomType());
        service.setHasCameraAccess(serviceDTO.getHasCameraAccess());
        service.setIncludesFood(serviceDTO.getIncludesFood());
        service.setNumberOfStaff(serviceDTO.getNumberOfStaff());

        service.setDurationPerWalk(serviceDTO.getDurationPerWalk());
        service.setGroupWalk(serviceDTO.getGroupWalk());
        service.setMaxDogs(serviceDTO.getMaxDogs());
        service.setAreaCovered(serviceDTO.getAreaCovered());

        if (serviceDTO.getOptions() != null) {
            for (com.elif.dto.service.ServiceOptionDTO optionDTO : serviceDTO.getOptions()) {
                com.elif.entities.service.ServiceOption option = new com.elif.entities.service.ServiceOption();
                option.setName(optionDTO.getName());
                option.setPrice(optionDTO.getPrice() != null ? optionDTO.getPrice() : 0.0);
                service.addOption(option);
            }
        }

        return serviceRepository.save(service);
    }

    public Service update(Long id, Service service) {
        Service existing = getById(id);
        if (service.getName() != null) {
            existing.setName(service.getName());
        }
        if (service.getDescription() != null) {
            existing.setDescription(service.getDescription());
        }
        if (service.getPrice() > 0) {
            existing.setPrice(service.getPrice());
        }
        if (service.getDuration() > 0) {
            existing.setDuration(service.getDuration());
        }
        if (service.getStatus() != null) {
            existing.setStatus(service.getStatus());
        }
        if (service.getCategory() != null) {
            existing.setCategory(service.getCategory());
        }
        if (service.getProvider() != null) {
            existing.setProvider(service.getProvider());
        }
        return serviceRepository.save(existing);
    }

    public Service update(Long id, ServiceDTO serviceDTO) {
        Service existing = getById(id);

        if (serviceDTO.getName() != null) {
            existing.setName(serviceDTO.getName());
        }
        if (serviceDTO.getDescription() != null) {
            existing.setDescription(serviceDTO.getDescription());
        }
        if (serviceDTO.getPrice() != null) {
            existing.setPrice(serviceDTO.getPrice());
        }
        if (serviceDTO.getDuration() != null) {
            existing.setDuration(serviceDTO.getDuration());
        }
        if (serviceDTO.getStatus() != null) {
            existing.setStatus(serviceDTO.getStatus());
        }
        if (serviceDTO.getImageUrl() != null) {
            existing.setImageUrl(serviceDTO.getImageUrl());
        }

        if (serviceDTO.getCategoryId() != null) {
            ServiceCategory category = serviceCategoryRepository.findById(serviceDTO.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "ServiceCategory not found with id: " + serviceDTO.getCategoryId()));
            existing.setCategory(category);
        }
        if (serviceDTO.getProviderId() != null) {
            User provider = userRepository.findById(serviceDTO.getProviderId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "User not found with id: " + serviceDTO.getProviderId()));
            existing.setProvider(provider);
        }

        existing.setClinicName(serviceDTO.getClinicName());
        existing.setConsultationType(serviceDTO.getConsultationType());
        existing.setEmergencyAvailable(serviceDTO.getEmergencyAvailable());
        existing.setRequiresAppointment(serviceDTO.getRequiresAppointment());

        existing.setPetSize(serviceDTO.getPetSize());
        existing.setIncludesBath(serviceDTO.getIncludesBath());
        existing.setIncludesHaircut(serviceDTO.getIncludesHaircut());
        existing.setProductsUsed(serviceDTO.getProductsUsed());

        existing.setTrainingType(serviceDTO.getTrainingType());
        existing.setSessionsCount(serviceDTO.getSessionsCount());
        existing.setSessionDuration(serviceDTO.getSessionDuration());
        existing.setGroupTraining(serviceDTO.getGroupTraining());

        existing.setCapacity(serviceDTO.getCapacity());
        existing.setOvernight(serviceDTO.getOvernight());
        existing.setHasOutdoorSpace(serviceDTO.getHasOutdoorSpace());
        existing.setMaxStayDays(serviceDTO.getMaxStayDays());

        existing.setRoomType(serviceDTO.getRoomType());
        existing.setHasCameraAccess(serviceDTO.getHasCameraAccess());
        existing.setIncludesFood(serviceDTO.getIncludesFood());
        existing.setNumberOfStaff(serviceDTO.getNumberOfStaff());

        existing.setDurationPerWalk(serviceDTO.getDurationPerWalk());
        existing.setGroupWalk(serviceDTO.getGroupWalk());
        existing.setMaxDogs(serviceDTO.getMaxDogs());
        existing.setAreaCovered(serviceDTO.getAreaCovered());

        if (serviceDTO.getOptions() != null) {
            // Clear existing options
            existing.getOptions().clear();
            for (com.elif.dto.service.ServiceOptionDTO optionDTO : serviceDTO.getOptions()) {
                com.elif.entities.service.ServiceOption option = new com.elif.entities.service.ServiceOption();
                option.setName(optionDTO.getName());
                option.setPrice(optionDTO.getPrice() != null ? optionDTO.getPrice() : 0.0);
                existing.addOption(option);
            }
        }

        return serviceRepository.save(existing);
    }

    public void delete(Long id) {
        Service service = getById(id);
        serviceRepository.delete(service);
    }

    public List<Service> findByCategoryId(Long categoryId) {
        return serviceRepository.findByCategoryId(categoryId);
    }

    public List<Service> findByStatus(String status) {
        return serviceRepository.findByStatus(status);
    }

    // ==================== SMART RECOMMENDATION ENGINE ====================
    public List<RecommendedServiceDTO> getRecommendations(Long userId, Long currentServiceId, String userLocation) {
        // Only recommend ACTIVE services
        List<Service> allServices = serviceRepository.findByStatus("ACTIVE");

        // --- 1. User booking history: preferred category IDs + average price ---
        Set<Long> userCategoryIds = new HashSet<>();
        double userAvgPrice = 0;
        if (userId != null) {
            List<ServiceBooking> userBookings = serviceBookingRepository.findByUserId(userId);
            for (ServiceBooking booking : userBookings) {
                if (booking.getService() != null && booking.getService().getCategory() != null) {
                    userCategoryIds.add(booking.getService().getCategory().getId());
                }
            }
            if (!userBookings.isEmpty()) {
                userAvgPrice = userBookings.stream()
                        .mapToDouble(ServiceBooking::getTotalPrice)
                        .average()
                        .orElse(0);
            }
        }

        // --- 2. Popularity map: serviceId -> booking count (from DB aggregate) ---
        Map<Long, Long> popularityMap = new java.util.HashMap<>();
        List<Object[]> popularityCounts = serviceRepository.findServicePopularityCounts();
        for (Object[] row : popularityCounts) {
            popularityMap.put((Long) row[0], (Long) row[1]);
        }

        // Max booking count (for normalization)
        long maxBookings = popularityMap.values().stream().mapToLong(v -> v).max().orElse(1L);

        // --- 3. Current service context (for "similar to this" recommendations) ---
        Long currentCategoryId = null;
        double currentServicePrice = 0;
        if (currentServiceId != null) {
            Service current = serviceRepository.findById(currentServiceId).orElse(null);
            if (current != null) {
                if (current.getCategory() != null) currentCategoryId = current.getCategory().getId();
                currentServicePrice = current.getPrice();
            }
        }

        // --- 4. Score each service ---
        List<RecommendedServiceDTO> results = new ArrayList<>();
        for (Service service : allServices) {
            if (currentServiceId != null && service.getId().equals(currentServiceId)) continue;

            int score = 0;
            String reasonLabel = "";

            Long catId = service.getCategory() != null ? service.getCategory().getId() : null;

            // [A] Category match: user history or current service context → +40 pts
            boolean categoryMatch = false;
            if (catId != null) {
                if (currentCategoryId != null && catId.equals(currentCategoryId)) {
                    categoryMatch = true;
                    reasonLabel = "Similar to what you viewed";
                } else if (userCategoryIds.contains(catId)) {
                    categoryMatch = true;
                    reasonLabel = "Based on your history";
                }
            }
            if (categoryMatch) score += 40;

            // [B] Popularity boost: normalized 0-30 pts based on booking share
            long bookings = popularityMap.getOrDefault(service.getId(), 0L);
            int popularityScore = (int) Math.round((bookings * 30.0) / maxBookings);
            score += popularityScore;
            if (bookings >= 5 && reasonLabel.isEmpty()) reasonLabel = "Trending";

            // [C] Rating quality: +15 pts if >= 4.0, +25 pts if >= 4.5
            double rating = service.getRating() != null ? service.getRating() : 0.0;
            if (rating >= 4.5) {
                score += 25;
                if (reasonLabel.isEmpty()) reasonLabel = "Top Rated";
            } else if (rating >= 4.0) {
                score += 15;
                if (reasonLabel.isEmpty()) reasonLabel = "Highly Rated";
            }

            // [D] Price proximity: +10 pts if within ±30% of user's average spend
            if (userAvgPrice > 0) {
                double priceDiff = Math.abs(service.getPrice() - userAvgPrice) / userAvgPrice;
                if (priceDiff <= 0.30) {
                    score += 10;
                } else if (priceDiff <= 0.60) {
                    score += 5;
                }
            } else if (currentServicePrice > 0) {
                // Fallback: compare to current service price
                double priceDiff = Math.abs(service.getPrice() - currentServicePrice) / currentServicePrice;
                if (priceDiff <= 0.30) score += 10;
            }

            // [E] Location match: +5 pts
            if (userLocation != null && !userLocation.isBlank() && service.getAreaCovered() != null) {
                String loc = userLocation.toLowerCase();
                String area = service.getAreaCovered().toLowerCase();
                if (area.contains(loc) || loc.contains(area)) {
                    score += 5;
                    if (reasonLabel.isEmpty()) reasonLabel = "Near you";
                }
            }

            // Skip services with no signal at all
            if (score <= 0) continue;
            if (reasonLabel.isEmpty()) reasonLabel = "Recommended";

            // Build provider name
            String providerName = "";
            if (service.getProvider() != null) {
                providerName = service.getProvider().getFirstName() + " " + service.getProvider().getLastName();
            }

            String catName = service.getCategory() != null ? service.getCategory().getName() : "General";

            results.add(RecommendedServiceDTO.builder()
                    .id(service.getId())
                    .name(service.getName())
                    .categoryName(catName)
                    .score(score)
                    .rating(rating)
                    .imageUrl(service.getImageUrl())
                    .price(service.getPrice())
                    .duration(service.getDuration())
                    .providerName(providerName.isBlank() ? "Elif Provider" : providerName)
                    .bookingCount(bookings)
                    .trending(bookings >= 5)
                    .topRated(rating >= 4.5)
                    .reasonLabel(reasonLabel)
                    .build());
        }

        // --- 5. Sort by score desc, then by rating desc as tie-breaker + limit 6 ---
        results.sort(Comparator
                .comparingInt(RecommendedServiceDTO::getScore).reversed()
                .thenComparingDouble(RecommendedServiceDTO::getRating).reversed());

        List<RecommendedServiceDTO> limited = results.stream().limit(6).collect(Collectors.toList());

        // --- 6. Fallback: if no recommendations, return top-rated active services ---
        if (limited.isEmpty()) {
            limited = allServices.stream()
                    .sorted(Comparator.comparingDouble(
                            (Service s) -> s.getRating() != null ? s.getRating() : 0.0).reversed())
                    .limit(6)
                    .map(service -> {
                        String providerName = "";
                        if (service.getProvider() != null) {
                            providerName = service.getProvider().getFirstName() + " " + service.getProvider().getLastName();
                        }
                        String catName = service.getCategory() != null ? service.getCategory().getName() : "General";
                        double rating = service.getRating() != null ? service.getRating() : 0.0;
                        long bookings = popularityMap.getOrDefault(service.getId(), 0L);
                        return RecommendedServiceDTO.builder()
                                .id(service.getId())
                                .name(service.getName())
                                .categoryName(catName)
                                .score(50) // score neutre pour le fallback
                                .rating(rating)
                                .imageUrl(service.getImageUrl())
                                .price(service.getPrice())
                                .duration(service.getDuration())
                                .providerName(providerName.isBlank() ? "Elif Provider" : providerName)
                                .bookingCount(bookings)
                                .trending(bookings >= 5)
                                .topRated(rating >= 4.5)
                                .reasonLabel("Top Service")
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return limited;
    }
}
