package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.TravelFeedback;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import com.elif.entities.pet_transit.enums.UrgencyLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelFeedbackRepository extends JpaRepository<TravelFeedback, Long>, JpaSpecificationExecutor<TravelFeedback> {

    List<TravelFeedback> findByTravelPlanId(Long travelPlanId);

    List<TravelFeedback> findByTravelPlanIdOrderByCreatedAtDesc(Long travelPlanId);

    List<TravelFeedback> findByTravelPlanIdAndFeedbackType(Long travelPlanId, FeedbackType type);

    List<TravelFeedback> findByProcessingStatus(ProcessingStatus status);

    List<TravelFeedback> findByUrgencyLevelAndProcessingStatus(UrgencyLevel urgency, ProcessingStatus status);

    List<TravelFeedback> findByUrgencyLevelInAndProcessingStatus(List<UrgencyLevel> urgencies, ProcessingStatus status);

    List<TravelFeedback> findByTravelPlanOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<TravelFeedback> findByFeedbackTypeAndProcessingStatus(FeedbackType feedbackType, ProcessingStatus processingStatus);

    List<TravelFeedback> findAllByOrderByCreatedAtDesc();

    long countByFeedbackType(FeedbackType feedbackType);

    long countByProcessingStatus(ProcessingStatus processingStatus);
}
