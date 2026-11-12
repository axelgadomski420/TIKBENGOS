package com.elif.services.service;

import com.elif.dto.service.ServiceReviewDTO;
import com.elif.entities.service.ServiceReview;
import com.elif.entities.user.User;
import com.elif.exceptions.ResourceNotFoundException;
import com.elif.repositories.service.ServiceRepository;
import com.elif.repositories.service.ServiceReviewRepository;
import com.elif.repositories.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceReviewService {

    private final ServiceReviewRepository reviewRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;

    public ServiceReviewService(ServiceReviewRepository reviewRepository,
                                ServiceRepository serviceRepository,
                                UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.serviceRepository = serviceRepository;
        this.userRepository = userRepository;
    }

    // ─── Lister les avis d'un service ─────────────────────────────────────────
    public List<ServiceReviewDTO> getReviewsByServiceId(Long serviceId) {
        return reviewRepository.findByServiceIdOrderByCreatedAtDesc(serviceId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ─── Ajouter un avis ──────────────────────────────────────────────────────
    @Transactional
    public ServiceReviewDTO addReview(Long serviceId, ServiceReviewDTO dto) {
        com.elif.entities.service.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));

        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + dto.getUserId()));

        // Vérifier si l'utilisateur a déjà laissé un avis
        if (reviewRepository.existsByServiceIdAndUserId(serviceId, dto.getUserId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vous avez déjà laissé un avis pour ce service.");
        }

        // Valider la note (1-5)
        if (dto.getRating() < 1 || dto.getRating() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La note doit être entre 1 et 5.");
        }

        ServiceReview review = ServiceReview.builder()
                .service(service)
                .user(user)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        ServiceReview saved = reviewRepository.save(review);

        // Recalculer et mettre à jour le rating agrégé du service
        updateServiceRating(service);

        return toDTO(saved);
    }

    // ─── Supprimer un avis ────────────────────────────────────────────────────
    @Transactional
    public void deleteReview(Long reviewId) {
        ServiceReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
        com.elif.entities.service.Service service = review.getService();
        reviewRepository.delete(review);
        updateServiceRating(service);
    }

    // ─── Recalculer le rating du service ──────────────────────────────────────
    private void updateServiceRating(com.elif.entities.service.Service service) {
        Double avg = reviewRepository.computeAverageRating(service.getId());
        long count = reviewRepository.countByServiceId(service.getId());
        service.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        service.setRatingCount((int) count);
        serviceRepository.save(service);
    }

    // ─── Mapper entité → DTO ──────────────────────────────────────────────────
    private ServiceReviewDTO toDTO(ServiceReview r) {
        return ServiceReviewDTO.builder()
                .id(r.getId())
                .serviceId(r.getService() != null ? r.getService().getId() : null)
                .userId(r.getUser() != null ? r.getUser().getId() : null)
                .userFirstName(r.getUser() != null ? r.getUser().getFirstName() : "")
                .userLastName(r.getUser() != null ? r.getUser().getLastName() : "")
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
