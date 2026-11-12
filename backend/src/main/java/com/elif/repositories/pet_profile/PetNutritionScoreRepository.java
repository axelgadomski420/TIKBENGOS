package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetNutritionScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PetNutritionScoreRepository extends JpaRepository<PetNutritionScore, Long> {
    Optional<PetNutritionScore> findByPetIdAndScoreDate(Long petId, LocalDate date);
    List<PetNutritionScore> findByPetIdAndScoreDateBetweenOrderByScoreDateDesc(Long petId, LocalDate from, LocalDate to);
    List<PetNutritionScore> findByPetIdOrderByScoreDateDesc(Long petId);
    void deleteByPetId(Long petId);
}
