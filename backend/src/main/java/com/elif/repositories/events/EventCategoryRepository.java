package com.elif.repositories.events;  // ← Correction: repository → repositories

import com.elif.entities.events.EventCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventCategoryRepository extends JpaRepository<EventCategory, Long> {

    // Recherche insensible à la casse
    Optional<EventCategory> findByNameIgnoreCase(String name);

    // Vérification existence (insensible à la casse)
    boolean existsByNameIgnoreCase(String name);

    // Vérifier si une catégorie est utilisée par des événements
    @Query("SELECT COUNT(e) > 0 FROM Event e WHERE e.category.id = :categoryId")
    boolean isCategoryUsed(@Param("categoryId") Long categoryId);
}