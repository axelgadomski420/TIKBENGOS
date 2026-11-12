package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.TravelDocument;
import com.elif.entities.pet_transit.enums.DocumentType;
import com.elif.entities.pet_transit.enums.DocumentValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelDocumentRepository extends JpaRepository<TravelDocument, Long> {

    List<TravelDocument> findByTravelPlanId(Long travelPlanId);

    List<TravelDocument> findByTravelPlanIdAndDocumentType(Long travelPlanId, DocumentType type);

    List<TravelDocument> findByTravelPlanIdAndValidationStatus(Long travelPlanId, DocumentValidationStatus status);

    int countByTravelPlanIdAndValidationStatus(Long travelPlanId, DocumentValidationStatus status);
}
