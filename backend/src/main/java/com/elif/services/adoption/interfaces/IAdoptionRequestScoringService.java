package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.AdoptionRequest;
import java.util.List;

/**
 * Interface pour le service de scoring des demandes d'adoption.
 * Calcule un score de compatibilité (0-100) pour chaque demande
 * selon le profil de l'adoptant et les besoins de l'animal.
 */
public interface IAdoptionRequestScoringService {

    /**
     * Calcule le score de compatibilité pour une demande d'adoption
     * @param request la demande d'adoption
     * @return score entre 0 et 100
     */
    int calculateScore(AdoptionRequest request);

    /**
     * Génère la liste des raisons qui expliquent le score
     * @param request la demande d'adoption
     * @return liste des raisons (points forts et points faibles)
     */
    List<String> getScoreReasons(AdoptionRequest request);

    /**
     * Retourne le libellé du score (Excellent, Very Good, Good, Fair, Low)
     * @param score le score calculé
     * @return libellé du score
     */
    String getScoreLabel(int score);

    /**
     * Retourne la couleur associée au score (pour affichage)
     * @param score le score calculé
     * @return code couleur hexadécimal
     */
    String getScoreColor(int score);
}