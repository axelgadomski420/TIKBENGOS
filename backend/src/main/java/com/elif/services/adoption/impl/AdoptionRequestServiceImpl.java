package com.elif.services.adoption.impl;

import com.elif.entities.adoption.AdoptionPet;
import com.elif.entities.adoption.AdoptionRequest;
import com.elif.entities.adoption.Appointment;
import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.entities.user.User;
import com.elif.repositories.adoption.AdoptionRequestRepository;
import com.elif.repositories.adoption.AppointmentRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.services.adoption.interfaces.AdoptionPetService;
import com.elif.services.adoption.interfaces.AdoptionRequestService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AdoptionRequestServiceImpl implements AdoptionRequestService {

    private final AdoptionRequestRepository requestRepository;
    private final AdoptionPetService petService;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public AdoptionRequestServiceImpl(AdoptionRequestRepository requestRepository,
                                      AdoptionPetService petService,
                                      UserRepository userRepository,
                                      AppointmentRepository appointmentRepository) {
        this.requestRepository     = requestRepository;
        this.petService            = petService;
        this.userRepository        = userRepository;
        this.appointmentRepository = appointmentRepository;
    }

    // ============================================================
    // MÉTHODES DE BASE
    // ============================================================

    @Override
    public List<AdoptionRequest> findAll() {
        return requestRepository.findAll();
    }

    @Override
    public AdoptionRequest findById(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée avec l'id: " + id));
    }

    @Override
    public List<AdoptionRequest> findByPetId(Long petId) {
        return requestRepository.findByPetId(petId);
    }

    @Override
    public List<AdoptionRequest> findByAdopterId(Long adopterId) {
        return requestRepository.findByAdopterId(adopterId);
    }

    @Override
    public List<AdoptionRequest> findByShelterId(Long shelterId) {
        return requestRepository.findByShelterId(shelterId);
    }

    @Override
    public List<AdoptionRequest> findByStatus(RequestStatus status) {
        return requestRepository.findByStatus(status);
    }

    @Override
    public AdoptionRequest create(Long petId, Long userId, String notes,
                                  String housingType, Boolean hasGarden,
                                  Boolean hasChildren, String otherPets,
                                  String experienceLevel) {
        AdoptionPet pet = petService.findById(petId);

        if (!pet.getAvailable()) {
            throw new RuntimeException("Cet animal n'est plus disponible à l'adoption");
        }

        User adopter = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        List<RequestStatus> activeStatuses = List.of(RequestStatus.PENDING, RequestStatus.UNDER_REVIEW);
        if (requestRepository.existsByPetIdAndAdopterIdAndStatusIn(petId, userId, activeStatuses)) {
            throw new RuntimeException("Vous avez déjà une demande en cours pour cet animal");
        }

        AdoptionRequest request = AdoptionRequest.builder()
                .pet(pet)
                .adopter(adopter)
                .status(RequestStatus.PENDING)
                .dateRequested(LocalDateTime.now())
                .notes(notes)
                .housingType(housingType)
                .hasGarden(hasGarden)
                .hasChildren(hasChildren)
                .otherPets(otherPets)
                .experienceLevel(experienceLevel)
                .build();

        return requestRepository.save(request);
    }

    @Override
    public AdoptionRequest update(Long requestId, String notes) {
        AdoptionRequest request = findById(requestId);
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new RuntimeException("Cette demande ne peut plus être modifiée");
        }
        request.setNotes(notes);
        return requestRepository.save(request);
    }

    // ============================================================
    // ✅ APPROVE — rejette TOUTES les autres demandes (PENDING + UNDER_REVIEW)
    //             et annule tous leurs rendez-vous
    // ============================================================

    @Override
    public AdoptionRequest approve(Long requestId) {
        AdoptionRequest request = findById(requestId);

        if (!request.getPet().getAvailable()) {
            throw new RuntimeException("Cet animal n'est plus disponible");
        }

        // 1️⃣ Approuver cette demande
        request.setStatus(RequestStatus.APPROVED);
        request.setApprovedDate(LocalDateTime.now());
        requestRepository.save(request);

        // 2️⃣ Marquer l'animal comme adopté
        Long petId = request.getPet().getId();
        petService.markAsAdopted(petId);

        // 3️⃣ ✅ Rejeter TOUTES les autres demandes actives (PENDING + UNDER_REVIEW)
        //    pour cet animal — pas seulement PENDING !
        List<AdoptionRequest> otherRequests = findActiveRequestsByPet(petId);

        for (AdoptionRequest other : otherRequests) {
            if (!other.getId().equals(requestId)) {
                other.setStatus(RequestStatus.REJECTED);
                other.setRejectionReason("Another adopter has been selected for this animal.");
                requestRepository.save(other);
            }
        }

        // 4️⃣ Compléter le RDV de la demande approuvée (si existant et SCHEDULED)
        List<Appointment> myAppointments = appointmentRepository.findByRequestId(requestId);
        for (Appointment appt : myAppointments) {
            if ("SCHEDULED".equals(appt.getStatus())) {
                appt.setStatus("COMPLETED");
                appt.setConsultationResult("APPROVED");
                appt.setResponseMessage(
                        "Adoption approved directly. On-site visit no longer required.");
                appt.setUpdatedAt(LocalDateTime.now());
                appointmentRepository.save(appt);
            }
        }

        // 5️⃣ ✅ Annuler les RDV de TOUS les autres candidats pour cet animal
        List<Appointment> allPetAppointments = appointmentRepository
                .findByPetIdOrderByAppointmentDateAsc(petId);
        for (Appointment appt : allPetAppointments) {
            if ("SCHEDULED".equals(appt.getStatus())
                    && !appt.getRequest().getId().equals(requestId)) {
                appt.setStatus("CANCELLED");
                appt.setResponseMessage(
                        "Appointment cancelled — another adopter has been selected.");
                appt.setUpdatedAt(LocalDateTime.now());
                appointmentRepository.save(appt);
            }
        }

        return requestRepository.save(request);
    }

    @Override
    public AdoptionRequest reject(Long requestId, String reason) {
        AdoptionRequest request = findById(requestId);
        request.setStatus(RequestStatus.REJECTED);
        request.setRejectionReason(reason);
        return requestRepository.save(request);
    }

    @Override
    public AdoptionRequest underReview(Long requestId) {
        AdoptionRequest request = findById(requestId);
        request.setStatus(RequestStatus.UNDER_REVIEW);
        return requestRepository.save(request);
    }

    @Override
    public AdoptionRequest cancel(Long requestId, Long userId) {
        AdoptionRequest request = findById(requestId);
        if (!request.getAdopter().getId().equals(userId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à annuler cette demande");
        }
        if (request.getStatus() == RequestStatus.APPROVED) {
            throw new RuntimeException("Cette demande a déjà été approuvée, contactez le refuge");
        }
        request.setStatus(RequestStatus.CANCELLED);
        return requestRepository.save(request);
    }

    @Override
    public boolean hasActiveRequest(Long petId, Long userId) {
        List<RequestStatus> activeStatuses = List.of(RequestStatus.PENDING, RequestStatus.UNDER_REVIEW);
        return requestRepository.existsByPetIdAndAdopterIdAndStatusIn(petId, userId, activeStatuses);
    }

    // ============================================================
    // ✅ NOUVELLE MÉTHODE : trouver les demandes actives pour un animal
    // ============================================================

    @Override
    public List<AdoptionRequest> findActiveRequestsByPet(Long petId) {
        List<RequestStatus> activeStatuses = List.of(
                RequestStatus.PENDING,
                RequestStatus.UNDER_REVIEW
        );
        return requestRepository.findByPetIdAndStatusIn(petId, activeStatuses);
    }

    // ============================================================
    // STATISTIQUES
    // ============================================================

    @Override
    public Long countPendingRequestsByShelterId(Long shelterId) {
        List<RequestStatus> statuses = List.of(RequestStatus.PENDING, RequestStatus.UNDER_REVIEW);
        return requestRepository.countPendingRequestsByShelterId(shelterId, statuses);
    }

    @Override
    public List<Object[]> findTopAdopters(int limit) {
        List<Object[]> results = requestRepository.findTopAdopters();
        // Limiter les résultats manuellement
        return results.stream().limit(limit).collect(Collectors.toList());
    }

    @Override
    public List<Object[]> findMostRequestedPets(int limit) {
        List<Object[]> results = requestRepository.findMostRequestedPets();
        // Limiter les résultats manuellement
        return results.stream().limit(limit).collect(Collectors.toList());
    }

    @Override
    public List<Object[]> countRequestsByStatusForShelter(Long shelterId) {
        return requestRepository.countRequestsByStatusForShelter(shelterId);
    }

    @Override
    public List<AdoptionRequest> findPendingRequestsOlderThan(int days) {
        return requestRepository.findPendingRequestsOlderThan(days, RequestStatus.PENDING);
    }

    @Override
    public List<Object[]> countRequestsByDay(int days) {
        return requestRepository.countRequestsByDay(days);
    }

    @Override
    public List<Object[]> countApprovedRequestsByMonth() {
        return requestRepository.countApprovedRequestsByMonth();
    }

    @Override
    public List<AdoptionRequest> findRequestsByAdopterWithPet(Long userId) {
        return requestRepository.findRequestsByAdopterWithPet(userId);
    }

    @Override
    public List<AdoptionRequest> findRequestsByShelterWithPet(Long shelterId) {
        return requestRepository.findRequestsByShelterWithPet(shelterId);
    }

    @Override
    public List<AdoptionRequest> findRejectedRequestsWithReason() {
        return requestRepository.findRejectedRequestsWithReason(RequestStatus.REJECTED);
    }

    @Override
    public boolean hasApprovedRequest(Long userId) {
        return requestRepository.existsByAdopterIdAndStatus(userId, RequestStatus.APPROVED);
    }

    @Override
    public boolean hasPendingRequestsForPet(Long petId) {
        return requestRepository.existsByPetIdAndStatus(petId, RequestStatus.PENDING);
    }

    @Override
    public List<AdoptionRequest> findByDateBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return requestRepository.findByCreatedAtBetween(startDate, endDate);
    }

    @Override
    public List<Object[]> countRequestsByShelter() {
        return requestRepository.countRequestsByShelter();
    }

    @Override
    public Long countApprovedRequestsByShelterId(Long shelterId) {
        return requestRepository.countApprovedRequestsByShelterId(shelterId);
    }

    @Override
    public Long countRejectedRequestsByShelterId(Long shelterId) {
        return requestRepository.countRejectedRequestsByShelterId(shelterId);
    }

    @Override
    public List<AdoptionRequest> findApprovedRequestsBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return requestRepository.findApprovedRequestsBetween(startDate, endDate);
    }
}