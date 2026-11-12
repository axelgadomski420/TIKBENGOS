package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetHealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PetHealthRecordRepository extends JpaRepository<PetHealthRecord, Long> {
    List<PetHealthRecord> findByPetIdOrderByRecordDateDescCreatedAtDesc(Long petId);
    List<PetHealthRecord> findByPetIdOrderByRecordDateDesc(Long petId);
    Optional<PetHealthRecord> findByIdAndPetId(Long id, Long petId);
    void deleteByPetId(Long petId);
}
