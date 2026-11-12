package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetFeedingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PetFeedingLogRepository extends JpaRepository<PetFeedingLog, Long> {
    List<PetFeedingLog> findByPetIdOrderByFedAtDesc(Long petId);
    List<PetFeedingLog> findByPetIdAndFedAtBetweenOrderByFedAtDesc(Long petId, LocalDateTime from, LocalDateTime to);
    Optional<PetFeedingLog> findByIdAndPetId(Long id, Long petId);
    long countByPetIdAndFedAtBetween(Long petId, LocalDateTime from, LocalDateTime to);
    long countByPetIdAndFedAtBetweenAndStatus(Long petId, LocalDateTime from, LocalDateTime to, com.elif.entities.pet_profile.enums.PetFeedingStatus status);
    @Query("select coalesce(sum(l.caloriesActual), 0) from PetFeedingLog l where l.pet.id = :petId and l.fedAt between :from and :to")
    Integer sumCaloriesByPetIdAndFedAtBetween(Long petId, LocalDateTime from, LocalDateTime to);
    void deleteByPetId(Long petId);
}
