package com.elif.services.adoption.interfaces;

import com.elif.dto.adoption.response.AtRiskPetDTO;

import java.util.List;
import java.util.Map;

/**
 * Interface pour le service de détection et scoring des animaux "à risque"
 */
public interface IAtRiskPetScoringService {

    /**
     * Analyse tous les animaux disponibles et retourne ceux avec un score >= 20
     * @return Liste des animaux à risque triés par score décroissant
     */
    List<AtRiskPetDTO> analyzeAllAvailablePets();

    /**
     * Analyse les animaux d'un shelter spécifique
     * @param shelterId ID du shelter
     * @return Liste des animaux du shelter avec leur score
     */
    List<AtRiskPetDTO> analyzeByShelterId(Long shelterId);

    /**
     * Retourne uniquement les animaux en situation critique ou à risque
     * @return Liste des animaux CRITICAL et AT_RISK
     */
    List<AtRiskPetDTO> getCriticalOnly();

    /**
     * Analyse un animal spécifique
     * @param pet L'animal à analyser
     * @return DTO avec le score et les recommandations
     */
    AtRiskPetDTO analyze(com.elif.entities.adoption.AdoptionPet pet);

    /**
     * Retourne le niveau de risque en fonction du score
     * @param score Score calculé (0-100)
     * @return Niveau de risque (SAFE, WATCH, AT_RISK, CRITICAL)
     */
    String getRiskLevel(int score);

    /**
     * Retourne la couleur associée au score
     * @param score Score calculé (0-100)
     * @return Code couleur hexadécimal
     */
    String getRiskColor(int score);

    /**
     * Retourne le label avec emoji pour le score
     * @param score Score calculé (0-100)
     * @return Label formaté (ex: "🔴 Critical")
     */
    String getRiskLabel(int score);

    /**
     * Retourne les statistiques globales des animaux à risque
     * @return Map contenant les statistiques agrégées
     */
    Map<String, Object> getGlobalStats();
}