package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.enums.PetSpecies;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PetProfileRepository extends JpaRepository<PetProfile, Long> {
    List<PetProfile> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<PetProfile> findByIdAndUserId(Long id, Long userId);

    List<PetProfile> findByUserIdAndSpeciesOrderByCreatedAtDesc(Long userId, PetSpecies species);

    List<PetProfile> findAllByOrderByCreatedAtDesc();
}
