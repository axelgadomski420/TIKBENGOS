package com.elif.repositories.pet_transit.specifications;

import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class TravelPlanSpecifications {

    private TravelPlanSpecifications() {
    }

    public static Specification<TravelPlan> byFilters(
            Long ownerId,
            boolean adminVisibleOnly,
            TravelPlanStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return Specification.where(hasOwnerId(ownerId))
                .and(isAdminVisibleIfRequired(adminVisibleOnly))
                .and(hasStatus(status))
                .and(matchesSearch(search))
                .and(travelDateOnOrAfter(startDate))
                .and(travelDateOnOrBefore(endDate));
    }

    public static Specification<TravelPlan> hasOwnerId(Long ownerId) {
        if (ownerId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    public static Specification<TravelPlan> isAdminVisibleIfRequired(boolean adminVisibleOnly) {
        if (!adminVisibleOnly) {
            return null;
        }
        return (root, query, cb) -> cb.or(
                cb.isNull(root.get("adminVisible")),
                cb.isTrue(root.get("adminVisible"))
        );
    }

    public static Specification<TravelPlan> hasStatus(TravelPlanStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<TravelPlan> matchesSearch(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }

        String normalized = search.trim().toLowerCase();
        String likePattern = "%" + normalized + "%";
        Long numericSearch = parseLong(normalized);

        return (root, query, cb) -> {
            Join<Object, Object> destination = root.join("destination", JoinType.LEFT);
            Join<Object, Object> owner = root.join("owner", JoinType.LEFT);

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(cb.coalesce(owner.get("firstName"), "")), likePattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(owner.get("lastName"), "")), likePattern));
            predicates.add(cb.like(
                    cb.lower(
                            cb.concat(
                                    cb.concat(cb.coalesce(owner.get("firstName"), ""), " "),
                                    cb.coalesce(owner.get("lastName"), "")
                            )
                    ),
                    likePattern
            ));
            predicates.add(cb.like(cb.lower(cb.coalesce(destination.get("title"), "")), likePattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(destination.get("country"), "")), likePattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(destination.get("region"), "")), likePattern));
            predicates.add(cb.like(cb.lower(cb.coalesce(root.get("origin"), "")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("status").as(String.class)), likePattern));
            predicates.add(cb.like(cb.lower(root.get("transportType").as(String.class)), likePattern));

            if (numericSearch != null) {
                predicates.add(cb.equal(root.get("petId"), numericSearch));
            }

            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<TravelPlan> travelDateOnOrAfter(LocalDate startDate) {
        if (startDate == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("travelDate"), startDate);
    }

    public static Specification<TravelPlan> travelDateOnOrBefore(LocalDate endDate) {
        if (endDate == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("travelDate"), endDate);
    }

    private static Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
