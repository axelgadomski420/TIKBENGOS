package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetWeightLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PetWeightLogRepository extends JpaRepository<PetWeightLog, Long> {
    List<PetWeightLog> findByPetIdOrderByLoggedDateDesc(Long petId);
    List<PetWeightLog> findByPetIdAndLoggedDateBetweenOrderByLoggedDateDesc(Long petId, LocalDate from, LocalDate to);
    Optional<PetWeightLog> findByIdAndPetId(Long id, Long petId);
    Optional<PetWeightLog> findFirstByPetIdOrderByLoggedDateDesc(Long petId);
    void deleteByPetId(Long petId);
}
