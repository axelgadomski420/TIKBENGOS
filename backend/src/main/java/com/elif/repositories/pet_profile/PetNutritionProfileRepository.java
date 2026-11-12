package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetNutritionProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PetNutritionProfileRepository extends JpaRepository<PetNutritionProfile, Long> {
    Optional<PetNutritionProfile> findByPetId(Long petId);
    void deleteByPetId(Long petId);
}
