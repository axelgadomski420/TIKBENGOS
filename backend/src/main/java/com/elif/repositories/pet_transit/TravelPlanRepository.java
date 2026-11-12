package com.elif.repositories.pet_transit;

import com.elif.entities.pet_transit.TravelPlan;
import com.elif.entities.pet_transit.enums.TravelPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TravelPlanRepository extends JpaRepository<TravelPlan, Long>, JpaSpecificationExecutor<TravelPlan> {

    long countByStatus(TravelPlanStatus status);

    List<TravelPlan> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<TravelPlan> findByOwnerIdAndStatus(Long ownerId, TravelPlanStatus status);

    List<TravelPlan> findByStatusOrderByCreatedAtDesc(TravelPlanStatus status);

    List<TravelPlan> findByDestinationId(Long destinationId);

    boolean existsByDestinationId(Long destinationId);

    @Query("SELECT plan FROM TravelPlan plan WHERE plan.adminVisible IS NULL OR plan.adminVisible = true ORDER BY plan.createdAt DESC")
    List<TravelPlan> findAdminVisiblePlansOrderByCreatedAtDesc();

    @Query("SELECT plan FROM TravelPlan plan WHERE plan.id = :planId AND (plan.adminVisible IS NULL OR plan.adminVisible = true)")
    Optional<TravelPlan> findAdminVisibleById(@Param("planId") Long planId);

    List<TravelPlan> findByStatusAndTravelDate(TravelPlanStatus status, LocalDate travelDate);

    List<TravelPlan> findByStatusAndReturnDateLessThanEqual(TravelPlanStatus status, LocalDate date);
}
