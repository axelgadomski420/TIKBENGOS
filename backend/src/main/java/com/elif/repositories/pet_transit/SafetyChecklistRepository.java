package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.SafetyChecklist;
import com.elif.entities.pet_transit.enums.ChecklistCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SafetyChecklistRepository extends JpaRepository<SafetyChecklist, Long> {

    List<SafetyChecklist> findByTravelPlanId(Long travelPlanId);

    List<SafetyChecklist> findByTravelPlanIdAndCompleted(Long travelPlanId, boolean completed);

    List<SafetyChecklist> findByTravelPlanIdAndCategory(Long travelPlanId, ChecklistCategory category);

    int countByTravelPlanIdAndCompleted(Long travelPlanId, boolean completed);

    int countByTravelPlanIdAndMandatoryAndCompleted(Long travelPlanId, boolean mandatory, boolean completed);

    long countByTravelPlanId(Long travelPlanId);
}
