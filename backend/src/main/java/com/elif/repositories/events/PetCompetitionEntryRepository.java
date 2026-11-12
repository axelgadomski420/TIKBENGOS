package com.elif.repositories.events;

import com.elif.entities.events.PetCompetitionEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PetCompetitionEntryRepository extends JpaRepository<PetCompetitionEntry, Long> {

    // ─────────────────────────────────────────────────────────────
    // 📋 LISTES PAR ÉVÉNEMENT
    // ─────────────────────────────────────────────────────────────

    /** Tous les dossiers d'un événement, triés par score décroissant */
    @Query("SELECT e FROM PetCompetitionEntry e " +
            "WHERE e.event.id = :eventId " +
            "ORDER BY e.eligibilityScore DESC NULLS LAST")
    Page<PetCompetitionEntry> findByEventIdOrderByScoreDesc(
            @Param("eventId") Long eventId,
            Pageable pageable);

    /** Tous les dossiers d'un événement (sans tri spécifique) */
    List<PetCompetitionEntry> findByEventId(Long eventId);

    /** Tous les dossiers d'un événement avec un verdict spécifique */
    List<PetCompetitionEntry> findByEventIdAndEligibilityVerdict(Long eventId, String verdict);

    // ─────────────────────────────────────────────────────────────
    // 👥 LISTES PAR PARTICIPANT (PLUSIEURS ANIMAUX)
    // ─────────────────────────────────────────────────────────────

    /**
     * ✅ CORRIGÉ : Retourne une LISTE (plusieurs animaux possibles)
     * Un participant peut avoir soumis plusieurs animaux
     */
    List<PetCompetitionEntry> findByParticipantId(Long participantId);

    /**
     * Vérifie si un participant a déjà soumis un animal spécifique
     * (ex: par nom ou par race)
     */
    boolean existsByParticipantIdAndPetName(Long participantId, String petName);

    /**
     * Compter le nombre d'animaux soumis par un participant
     */
    long countByParticipantId(Long participantId);

    // ─────────────────────────────────────────────────────────────
    // 👤 LISTES PAR UTILISATEUR
    // ─────────────────────────────────────────────────────────────

    /** Tous les dossiers d'un utilisateur, triés par date */
    List<PetCompetitionEntry> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Tous les dossiers d'un utilisateur pour un événement spécifique */
    List<PetCompetitionEntry> findByUserIdAndEventId(Long userId, Long eventId);

    /**
     * ✅ CORRIGÉ : Vérifie si un utilisateur a déjà soumis un animal
     * pour un événement (peut être multiple, donc on compte)
     */
    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    /**
     * Compte le nombre d'animaux soumis par un utilisateur pour un événement
     */
    long countByEventIdAndUserId(Long eventId, Long userId);

    // ─────────────────────────────────────────────────────────────
    // 📊 STATISTIQUES
    // ─────────────────────────────────────────────────────────────

    /** Nombre total de dossiers soumis pour un événement */
    long countByEventId(Long eventId);

    /** Dossiers avec un score ≥ threshold (top candidats) */
    @Query("SELECT e FROM PetCompetitionEntry e " +
            "WHERE e.event.id = :eventId " +
            "AND e.eligibilityScore >= :minScore " +
            "ORDER BY e.eligibilityScore DESC")
    List<PetCompetitionEntry> findTopCandidates(
            @Param("eventId") Long eventId,
            @Param("minScore") int minScore);

    /** Statistiques des verdicts pour un événement */
    @Query("SELECT e.eligibilityVerdict, COUNT(e) FROM PetCompetitionEntry e " +
            "WHERE e.event.id = :eventId " +
            "GROUP BY e.eligibilityVerdict")
    List<Object[]> countByVerdictForEvent(@Param("eventId") Long eventId);

    /** Score moyen d'éligibilité pour un événement */
    @Query("SELECT AVG(e.eligibilityScore) FROM PetCompetitionEntry e " +
            "WHERE e.event.id = :eventId " +
            "AND e.eligibilityVerdict != 'INELIGIBLE'")
    Double getAverageScoreForEvent(@Param("eventId") Long eventId);

    /** Top races pour un événement */
    @Query("SELECT e.breed, COUNT(e) FROM PetCompetitionEntry e " +
            "WHERE e.event.id = :eventId " +
            "GROUP BY e.breed " +
            "ORDER BY COUNT(e) DESC")
    List<Object[]> findTopBreedsForEvent(@Param("eventId") Long eventId);

    // ─────────────────────────────────────────────────────────────
    // 🗑️ SUPPRESSIONS
    // ─────────────────────────────────────────────────────────────

    /** Supprimer tous les dossiers d'un événement */
    void deleteByEventId(Long eventId);

    /** Supprimer tous les dossiers d'un utilisateur */
    void deleteByUserId(Long userId);

    /** Supprimer un animal spécifique d'un participant */
    void deleteByParticipantIdAndPetName(Long participantId, String petName);

    void deleteByParticipantId(Long participantId);
}
