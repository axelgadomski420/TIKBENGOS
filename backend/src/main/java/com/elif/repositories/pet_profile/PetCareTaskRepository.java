package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetCareTask;
import com.elif.entities.pet_profile.enums.PetTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PetCareTaskRepository extends JpaRepository<PetCareTask, Long> {
    List<PetCareTask> findByPetIdOrderByUpdatedAtDesc(Long petId);

    Optional<PetCareTask> findByIdAndPetId(Long id, Long petId);

    void deleteByPetId(Long petId);
    
    List<PetCareTask> findByPetIdAndStatusNotAndDueDateNotNull(Long petId, PetTaskStatus status);
}
