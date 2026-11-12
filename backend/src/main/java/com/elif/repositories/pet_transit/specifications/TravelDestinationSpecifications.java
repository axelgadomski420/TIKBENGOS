package com.elif.repositories.pet_transit.specifications;

import com.elif.entities.pet_transit.TravelDestination;
import com.elif.entities.pet_transit.enums.DestinationStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class TravelDestinationSpecifications {

    private TravelDestinationSpecifications() {
    }

    public static Specification<TravelDestination> byFilters(
            DestinationStatus status,
            String search,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return Specification.where(hasStatus(status))
                .and(matchesSearch(search))
                .and(createdAtOnOrAfter(startDate))
                .and(createdAtOnOrBefore(endDate));
    }

    public static Specification<TravelDestination> hasStatus(DestinationStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<TravelDestination> matchesSearch(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }

        String pattern = "%" + search.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("country")), pattern),
                cb.like(cb.lower(cb.coalesce(root.get("region"), "")), pattern)
        );
    }

    public static Specification<TravelDestination> createdAtOnOrAfter(LocalDate startDate) {
        if (startDate == null) {
            return null;
        }

        LocalDateTime lowerBound = startDate.atStartOfDay();
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), lowerBound);
    }

    public static Specification<TravelDestination> createdAtOnOrBefore(LocalDate endDate) {
        if (endDate == null) {
            return null;
        }

        LocalDateTime exclusiveUpperBound = endDate.plusDays(1).atStartOfDay();
        return (root, query, cb) -> cb.lessThan(root.get("createdAt"), exclusiveUpperBound);
    }
}
