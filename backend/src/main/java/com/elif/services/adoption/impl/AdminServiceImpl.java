package com.elif.services.adoption.impl;

import com.elif.dto.adoption.response.AdminStatisticsResponseDTO;
import com.elif.dto.adoption.response.ShelterAdminDTO;
import com.elif.entities.adoption.*;
import com.elif.entities.adoption.enums.ContractStatus;
import com.elif.entities.adoption.enums.RequestStatus;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.repositories.adoption.*;
import com.elif.repositories.user.UserRepository;
import com.elif.services.adoption.interfaces.IAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminServiceImpl implements IAdminService {

    private final UserRepository userRepository;
    private final AdoptionPetRepository petRepository;
    private final AdoptionRequestRepository requestRepository;
    private final ContractRepository contractRepository;
    private final ShelterReviewRepository reviewRepository;
    private final ShelterRepository shelterRepository;
    private final AppointmentRepository appointmentRepository;

    // ============================================================
    // STATISTIQUES
    // ============================================================

    @Override
    public AdminStatisticsResponseDTO getStatistics() {
        // Construire la map petsByCategory depuis la requête groupée
        Map<String, Long> petsByCategory = new LinkedHashMap<>();
        List<Object[]> typeRows = petRepository.countByType();
        for (Object[] row : typeRows) {
            String type = row[0] != null ? row[0].toString() : "UNKNOWN";
            Long count = ((Number) row[1]).longValue();
            petsByCategory.put(type, count);
        }

        return AdminStatisticsResponseDTO.builder()
                .totalUsers(userRepository.count())
                .totalShelters(userRepository.countByRole(Role.SHELTER))
                .pendingShelters(userRepository.countByRoleAndVerified(Role.SHELTER, false))
                .verifiedShelters(userRepository.countByRoleAndVerified(Role.SHELTER, true))
                .totalPets(petRepository.count())
                .availablePets(petRepository.countByAvailable(true))
                .adoptedPets(petRepository.countByAvailable(false))
                .petsByCategory(petsByCategory)
                .totalAdoptionRequests(requestRepository.count())
                .pendingRequests(requestRepository.countByStatus(RequestStatus.PENDING))
                .approvedRequests(requestRepository.countByStatus(RequestStatus.APPROVED))
                .rejectedRequests(requestRepository.countByStatus(RequestStatus.REJECTED))
                .cancelledRequests(requestRepository.countByStatus(RequestStatus.CANCELLED))
                .underReviewRequests(requestRepository.countByStatus(RequestStatus.UNDER_REVIEW))
                .totalContracts(contractRepository.count())
                .totalRevenue(contractRepository.sumFraisAdoption() != null
                        ? contractRepository.sumFraisAdoption()
                        : BigDecimal.ZERO)
                .pendingReviews(reviewRepository.countPendingReviews())
                .approvedReviews(reviewRepository.countApprovedReviews())
                .totalReviews(reviewRepository.countTotalReviews())
                .build();
    }

    // ============================================================
    // GESTION DES REFUGES
    // ============================================================

    @Override
    public List<ShelterAdminDTO> getAllShelters() {
        return shelterRepository.findAll().stream()
                .map(this::toShelterDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ShelterAdminDTO getShelterById(Long id) {
        Shelter shelter = shelterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shelter not found with id: " + id));
        return toShelterDTO(shelter);
    }

    @Override
    public ShelterAdminDTO createShelter(ShelterAdminDTO shelterDTO) {
        Shelter shelter = new Shelter();
        shelter.setName(shelterDTO.getName());
        shelter.setAddress(shelterDTO.getAddress());
        shelter.setPhone(shelterDTO.getPhone());
        shelter.setEmail(shelterDTO.getEmail());
        shelter.setDescription(shelterDTO.getDescription());
        shelter.setLogoUrl(shelterDTO.getLogoUrl());
        shelter.setLicenseNumber(shelterDTO.getLicenseNumber());
        shelter.setVerified(shelterDTO.getVerified() != null ? shelterDTO.getVerified() : false);

        shelter = shelterRepository.save(shelter);
        return toShelterDTO(shelter);
    }

    @Override
    public ShelterAdminDTO updateShelter(Long id, ShelterAdminDTO shelterDTO) {
        Shelter shelter = shelterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shelter not found with id: " + id));

        shelter.setName(shelterDTO.getName());
        shelter.setAddress(shelterDTO.getAddress());
        shelter.setPhone(shelterDTO.getPhone());
        shelter.setEmail(shelterDTO.getEmail());
        shelter.setDescription(shelterDTO.getDescription());
        shelter.setLogoUrl(shelterDTO.getLogoUrl());
        if (shelterDTO.getLicenseNumber() != null) {
            shelter.setLicenseNumber(shelterDTO.getLicenseNumber());
        }
        if (shelterDTO.getVerified() != null) {
            shelter.setVerified(shelterDTO.getVerified());
        }

        shelter = shelterRepository.save(shelter);
        return toShelterDTO(shelter);
    }

    @Override
    @Transactional
    public void deleteShelter(Long id) {
        Shelter shelter = shelterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shelter not found with id: " + id));

        // ✅ 1. Récupérer le user associé (si existant)
        User user = shelter.getUser();

        // ✅ 2. Dissocier la relation des deux côtés
        if (user != null) {
            user.setShelter(null);  // Dissocier du côté User
            shelter.setUser(null);  // Dissocier du côté Shelter
            userRepository.save(user);  // Sauvegarder le user modifié
        }

        // ✅ 3. Sauvegarder le shelter modifié
        shelter = shelterRepository.save(shelter);

        // ✅ 4. Supprimer le shelter
        shelterRepository.delete(shelter);

        // ✅ 5. Supprimer le user (si existant)
        if (user != null) {
            userRepository.delete(user);
        }
    }

    // ============================================================
    // GESTION DES ANIMAUX
    // ============================================================

    @Override
    public List<AdoptionPet> getAllPets() {
        return petRepository.findAll();
    }

    @Override
    public AdoptionPet getPetById(Long id) {
        return petRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pet not found with id: " + id));
    }

    @Override
    public AdoptionPet createPet(AdoptionPet pet) {
        if (pet.getShelter() != null && pet.getShelter().getId() != null) {
            Shelter shelter = shelterRepository.findById(pet.getShelter().getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Shelter not found with id: " + pet.getShelter().getId()));
            pet.setShelter(shelter);
        } else {
            throw new RuntimeException("Shelter is required to create a pet");
        }
        return petRepository.save(pet);
    }

    @Override
    public AdoptionPet updatePet(Long id, AdoptionPet petDetails) {
        AdoptionPet pet = getPetById(id);

        pet.setName(petDetails.getName());
        pet.setType(petDetails.getType());
        pet.setBreed(petDetails.getBreed());
        pet.setAge(petDetails.getAge());
        pet.setGender(petDetails.getGender());
        pet.setSize(petDetails.getSize());
        pet.setColor(petDetails.getColor());
        pet.setHealthStatus(petDetails.getHealthStatus());
        pet.setSpayedNeutered(petDetails.getSpayedNeutered());
        pet.setSpecialNeeds(petDetails.getSpecialNeeds());
        pet.setDescription(petDetails.getDescription());
        pet.setPhotos(petDetails.getPhotos());

        if (petDetails.getShelter() != null && petDetails.getShelter().getId() != null) {
            Shelter shelter = shelterRepository.findById(petDetails.getShelter().getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Shelter not found with id: " + petDetails.getShelter().getId()));
            pet.setShelter(shelter);
        }

        return petRepository.save(pet);
    }

    @Override
    public void deletePet(Long id) {
        AdoptionPet pet = getPetById(id);
        petRepository.delete(pet);
    }

    // ============================================================
    // GESTION DES DEMANDES (REQUESTS)
    // ============================================================

    @Override
    public List<AdoptionRequest> getAllRequests() {
        return requestRepository.findAll();
    }

    @Override
    public AdoptionRequest getRequestById(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + id));
    }

    @Override
    public AdoptionRequest updateRequestStatus(Long id, RequestStatus status, String rejectionReason) {
        AdoptionRequest request = getRequestById(id);
        request.setStatus(status);
        if (rejectionReason != null && !rejectionReason.isEmpty()) {
            request.setRejectionReason(rejectionReason);
        }
        if (status == RequestStatus.APPROVED) {
            request.setApprovedDate(LocalDateTime.now());
        }
        return requestRepository.save(request);
    }

    @Override
    public void deleteRequest(Long id) {
        AdoptionRequest request = getRequestById(id);
        List<Appointment> appointments = appointmentRepository.findByRequestId(id);
        if (!appointments.isEmpty()) {
            for (Appointment appt : appointments) {
                appointmentRepository.delete(appt);
            }
        }
        requestRepository.delete(request);
    }

    // ============================================================
    // GESTION DES CONTRATS
    // ============================================================

    @Override
    public List<Contract> getAllContracts() {
        return contractRepository.findAll();
    }

    @Override
    public Contract getContractById(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contract not found with id: " + id));
    }

    @Override
    public Contract updateContractStatus(Long id, ContractStatus status) {
        Contract contract = getContractById(id);
        contract.setStatut(status);
        return contractRepository.save(contract);
    }

    @Override
    public void deleteContract(Long id) {
        Contract contract = getContractById(id);
        contractRepository.delete(contract);
    }

    @Override
    public byte[] generateContractPdf(Long id) {
        Contract contract = getContractById(id);

        String content = "ADOPTION CONTRACT\n\n" +
                "Contract Number: " + contract.getNumeroContrat() + "\n" +
                "Date: " + LocalDateTime.now().toLocalDate() + "\n\n" +
                "BETWEEN:\n" +
                "Shelter: " + (contract.getShelter() != null ? contract.getShelter().getName() : "N/A") + "\n\n" +
                "AND:\n" +
                "Adopter: " + (contract.getAdoptant() != null ?
                contract.getAdoptant().getFirstName() + " " + contract.getAdoptant().getLastName() : "N/A") + "\n" +
                "Email: " + (contract.getAdoptant() != null ? contract.getAdoptant().getEmail() : "N/A") + "\n\n" +
                "ANIMAL DETAILS:\n" +
                "Name: " + (contract.getAnimal() != null ? contract.getAnimal().getName() : "N/A") + "\n" +
                "Type: " + (contract.getAnimal() != null ? contract.getAnimal().getType() : "N/A") + "\n" +
                "Breed: " + (contract.getAnimal() != null && contract.getAnimal().getBreed() != null ?
                contract.getAnimal().getBreed() : "N/A") + "\n\n" +
                "CONDITIONS:\n" +
                (contract.getConditionsSpecifiques() != null ? contract.getConditionsSpecifiques() : "Standard adoption conditions apply.") + "\n\n" +
                "This adoption is FREE of charge.\n\n" +
                "SIGNATURES:\n" +
                "Adopter Signature: ___________________\n" +
                "Date: ___________________\n\n" +
                "Shelter Representative: ___________________\n" +
                "Date: ___________________\n\n" +
                "Generated by Elif Pet Adoption Platform\n";

        return content.getBytes();
    }

    // ============================================================
    // MÉTHODES UTILITAIRES PRIVÉES
    // ============================================================

    private ShelterAdminDTO toShelterDTO(Shelter shelter) {
        return ShelterAdminDTO.builder()
                .id(shelter.getId())
                .name(shelter.getName())
                .address(shelter.getAddress())
                .phone(shelter.getPhone())
                .email(shelter.getEmail())
                .licenseNumber(shelter.getLicenseNumber())
                .verified(shelter.getVerified())
                .description(shelter.getDescription())
                .logoUrl(shelter.getLogoUrl())
                .createdAt(shelter.getCreatedAt())
                .updatedAt(shelter.getUpdatedAt())
                .userId(shelter.getUser() != null ? shelter.getUser().getId() : null)
                .userEmail(shelter.getUser() != null ? shelter.getUser().getEmail() : null)
                .userVerified(shelter.getUser() != null ? shelter.getUser().getVerified() : null)
                .build();
    }
}