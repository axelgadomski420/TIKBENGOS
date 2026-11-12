package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetMealPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PetMealPlanRepository extends JpaRepository<PetMealPlan, Long> {
    List<PetMealPlan> findByPetIdAndActiveOrderByScheduledTimeAsc(Long petId, Boolean active);
    List<PetMealPlan> findByPetIdOrderByScheduledTimeAsc(Long petId);
    Optional<PetMealPlan> findByIdAndPetId(Long id, Long petId);
    void deleteByPetId(Long petId);
}
