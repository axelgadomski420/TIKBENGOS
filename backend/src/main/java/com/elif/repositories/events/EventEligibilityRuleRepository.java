package com.elif.repositories.events;

import com.elif.entities.events.EventEligibilityRule;
import com.elif.entities.events.RuleCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventEligibilityRuleRepository extends JpaRepository<EventEligibilityRule, Long> {

    /**
     * Toutes les règles actives d'un événement précis,
     * triées par priorité croissante (les plus importantes en premier).
     */
    @Query("SELECT r FROM EventEligibilityRule r " +
            "WHERE r.event.id = :eventId AND r.active = true " +
            "ORDER BY r.priority ASC")
    List<EventEligibilityRule> findActiveByEventId(@Param("eventId") Long eventId);

    /**
     * Toutes les règles actives d'une catégorie,
     * triées par priorité croissante.
     */
    @Query("SELECT r FROM EventEligibilityRule r " +
            "WHERE r.category.id = :categoryId AND r.active = true " +
            "ORDER BY r.priority ASC")
    List<EventEligibilityRule> findActiveByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Règles applicables à un événement = règles de sa catégorie + règles spécifiques.
     * Utilisée par le moteur d'éligibilité lors d'une tentative d'inscription.
     */
    @Query("SELECT r FROM EventEligibilityRule r " +
            "WHERE r.active = true " +
            "AND (r.event.id = :eventId OR r.category.id = :categoryId) " +
            "ORDER BY r.priority ASC")
    List<EventEligibilityRule> findAllApplicableRules(
            @Param("eventId")    Long eventId,
            @Param("categoryId") Long categoryId);

    /**
     * Récupère TOUTES les règles applicables à un événement (actives + inactives).
     * Utilisé par l'admin pour voir l'historique des règles.
     */
    @Query("SELECT r FROM EventEligibilityRule r " +
            "WHERE (r.event.id = :eventId OR r.category.id = :categoryId) " +
            "ORDER BY r.active DESC, r.priority ASC")
    List<EventEligibilityRule> findAllApplicableRulesIncludingInactive(
            @Param("eventId")    Long eventId,
            @Param("categoryId") Long categoryId);

    /**
     * Vérifie si une règle d'un critère donné existe déjà sur un événement.
     * Empêche les doublons de règles (ex: deux règles ALLOWED_BREEDS sur le même événement).
     */
    @Query("SELECT COUNT(r) > 0 FROM EventEligibilityRule r " +
            "WHERE r.event.id = :eventId AND r.criteria = :criteria AND r.active = true")
    boolean existsActiveByEventIdAndCriteria(
            @Param("eventId")  Long eventId,
            @Param("criteria") RuleCriteria criteria);

    /**
     * Même vérification sur une catégorie.
     */
    @Query("SELECT COUNT(r) > 0 FROM EventEligibilityRule r " +
            "WHERE r.category.id = :categoryId AND r.criteria = :criteria AND r.active = true")
    boolean existsActiveByCategoryIdAndCriteria(
            @Param("categoryId") Long categoryId,
            @Param("criteria")   RuleCriteria criteria);

    /**
     * Désactive toutes les règles d'un événement (soft delete).
     * Préféré à la suppression physique pour garder l'historique.
     * Retourne le nombre de règles désactivées.
     */
    @Modifying
    @Query("UPDATE EventEligibilityRule r SET r.active = false WHERE r.event.id = :eventId")
    int deactivateAllByEventId(@Param("eventId") Long eventId);

    /**
     * Désactive toutes les règles d'une catégorie.
     * Retourne le nombre de règles désactivées.
     */
    @Modifying
    @Query("UPDATE EventEligibilityRule r SET r.active = false WHERE r.category.id = :categoryId")
    int deactivateAllByCategoryId(@Param("categoryId") Long categoryId);
}