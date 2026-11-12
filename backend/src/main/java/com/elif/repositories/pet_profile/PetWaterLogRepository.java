package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetWaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PetWaterLogRepository extends JpaRepository<PetWaterLog, Long> {
    List<PetWaterLog> findByPetIdAndLoggedDateOrderByCreatedAtDesc(Long petId, LocalDate date);
    List<PetWaterLog> findByPetIdAndLoggedDateBetweenOrderByLoggedDateDesc(Long petId, LocalDate from, LocalDate to);
    Optional<PetWaterLog> findByIdAndPetId(Long id, Long petId);

    @Query("select coalesce(sum(w.amountMl), 0) from PetWaterLog w where w.pet.id = :petId and w.loggedDate = :date")
    Integer sumAmountMlByPetIdAndDate(Long petId, LocalDate date);

    void deleteByPetId(Long petId);
}
