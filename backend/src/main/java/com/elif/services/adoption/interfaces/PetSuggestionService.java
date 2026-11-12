package com.elif.services.adoption.interfaces;  // ← MÊME package que AdoptionPetService

import com.elif.dto.adoption.request.PetSearchCriteriaDTO;
import com.elif.dto.adoption.response.PetSuggestionDTO;
import java.util.List;

public interface PetSuggestionService {

    /**
     * Retourne une liste de suggestions d'animaux à adopter
     * basée sur les critères de recherche fournis.
     *
     * @param criteria les critères de recherche de l'utilisateur
     * @return liste triée des animaux compatibles avec leur score
     */
    List<PetSuggestionDTO> getSuggestions(PetSearchCriteriaDTO criteria);
}