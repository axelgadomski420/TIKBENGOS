package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.TravelDestinationImage;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelDestinationImageRepository extends JpaRepository<TravelDestinationImage, Long> {
    List<TravelDestinationImage> findByDestinationIdOrderByDisplayOrderAsc(Long destinationId);

    @Modifying
    @Transactional
    void deleteByDestinationId(Long destinationId);
}
