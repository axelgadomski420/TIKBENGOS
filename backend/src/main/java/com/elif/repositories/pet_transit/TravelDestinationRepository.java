package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TravelDestinationRepository extends JpaRepository<TravelDestination, Long>, JpaSpecificationExecutor<TravelDestination> {

    long countByStatus(DestinationStatus status);

    List<TravelDestination> findByStatus(DestinationStatus status);

    List<TravelDestination> findByStatusOrderByCreatedAtDesc(DestinationStatus status);

    List<TravelDestination> findByCountryAndStatus(String country, DestinationStatus status);

    List<TravelDestination> findByStatusAndScheduledPublishAtLessThanEqual(
            DestinationStatus status,
            LocalDateTime dateTime
    );
}
