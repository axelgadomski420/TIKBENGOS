package com.elif.dto.events.request;

import com.elif.entities.events.RuleCriteria;
import com.elif.entities.events.RuleValueType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO pour la création d'une règle d'éligibilité.
 * Envoyé par l'admin depuis le back-office.
 */
@Data
public class EligibilityRuleRequest {

    /** Lié à un événement précis (null si règle de catégorie) */
    private Long eventId;

    /** Lié à une catégorie entière (null si règle d'événement) */
    private Long categoryId;

    @NotNull
    private RuleCriteria criteria;

    @NotNull
    private RuleValueType valueType;

    /** Pour les critères LIST : valeurs séparées par virgules */
    private String listValues;

    /** Pour les critères NUMBER */
    private Integer numericValue;

    /** Pour les critères BOOLEAN */
    private Boolean booleanValue;

    /** true = rejet immédiat si violée, false = avertissement seulement */
    private Boolean hardReject = true;

    /** Message personnalisé (optionnel — sinon message par défaut) */
    private String rejectionMessage;

    /** Ordre d'évaluation (0 = priorité max) */
    private Integer priority = 0;
}