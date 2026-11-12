package com.elif.repositories.pet_transit.specifications;

import com.elif.entities.pet_transit.TravelFeedback;
import com.elif.entities.pet_transit.enums.FeedbackType;
import com.elif.entities.pet_transit.enums.ProcessingStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class TravelFeedbackSpecifications {

    private TravelFeedbackSpecifications() {
    }

    public static Specification<TravelFeedback> byFilters(
            Long ownerId,
            FeedbackType type,
            ProcessingStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return Specification.where(hasOwnerId(ownerId))
                .and(hasType(type))
                .and(hasStatus(status))
                .and(matchesSearch(search))
                .and(createdAtOnOrAfter(startDate))
                .and(createdAtOnOrBefore(endDate));
    }

    public static Specification<TravelFeedback> hasOwnerId(Long ownerId) {
        if (ownerId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("travelPlan").get("owner").get("id"), ownerId);
    }

    public static Specification<TravelFeedback> hasType(FeedbackType type) {
        if (type == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("feedbackType"), type);
    }

    public static Specification<TravelFeedback> hasStatus(ProcessingStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("processingStatus"), status);
    }

    public static Specification<TravelFeedback> matchesSearch(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }

        String pattern = "%" + search.trim().toLowerCase() + "%";

        return (root, query, cb) -> {
            Join<Object, Object> travelPlan = root.join("travelPlan", JoinType.LEFT);
            Join<Object, Object> destination = travelPlan.join("destination", JoinType.LEFT);
            Join<Object, Object> owner = travelPlan.join("owner", JoinType.LEFT);

            return cb.or(
                    cb.like(cb.lower(cb.coalesce(root.get("title"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("message"), "")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("incidentLocation"), "")), pattern),
                    cb.like(cb.lower(root.get("feedbackType").as(String.class)), pattern),
                    cb.like(cb.lower(root.get("processingStatus").as(String.class)), pattern),
                    cb.like(cb.lower(cb.coalesce(destination.get("title"), "")), pattern),
                    cb.like(
                            cb.lower(
                                    cb.concat(
                                            cb.concat(cb.coalesce(owner.get("firstName"), ""), " "),
                                            cb.coalesce(owner.get("lastName"), "")
                                    )
                            ),
                            pattern
                    )
            );
        };
    }

    public static Specification<TravelFeedback> createdAtOnOrAfter(LocalDate startDate) {
        if (startDate == null) {
            return null;
        }

        LocalDateTime lowerBound = startDate.atStartOfDay();
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), lowerBound);
    }

    public static Specification<TravelFeedback> createdAtOnOrBefore(LocalDate endDate) {
        if (endDate == null) {
            return null;
        }

        LocalDateTime exclusiveUpperBound = endDate.plusDays(1).atStartOfDay();
        return (root, query, cb) -> cb.lessThan(root.get("createdAt"), exclusiveUpperBound);
    }
}
