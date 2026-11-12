package com.elif.entities.events;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.validation.constraints.AssertTrue;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_eligibility_rule",
        indexes = {
                @Index(name = "idx_rule_category", columnList = "category_id"),
                @Index(name = "idx_rule_event", columnList = "event_id"),
                @Index(name = "idx_rule_active_priority", columnList = "active, priority")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventEligibilityRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Règle spécifique à un événement (optionnel)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    @JsonIgnore  // ✅ Évite la référence circulaire
    private Event event;

    // Règle applicable à toute une catégorie (optionnel)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnore  // ✅ Évite la référence circulaire
    private EventCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RuleCriteria criteria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RuleValueType valueType;

    // Pour LIST ou TEXT : valeurs séparées par des virgules
    @Column(columnDefinition = "TEXT")
    private String listValues;

    // Pour NUMBER
    private Integer numericValue;

    // Pour BOOLEAN
    private Boolean booleanValue;

    // Rejet automatique (true) ou simple avertissement (false)
    @Column(nullable = false)
    @Builder.Default
    private boolean hardReject = true;

    // Message personnalisé à afficher à l'utilisateur
    @Column(length = 500)
    private String rejectionMessage;

    // Ordre d'évaluation (plus petit = évalué en premier)
    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    // Activer/désactiver la règle
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ⚠️ SUPPRIME LES DOUBLONS CI-DESSOUS (ils sont déjà déclarés plus haut)
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "event_id")
    // @JsonIgnore
    // private Event event;
    //
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "category_id")
    // @JsonIgnore
    // private EventCategory category;

    // ========== VALIDATIONS ==========

    @AssertTrue(message = "Une règle doit être liée soit à une catégorie soit à un événement")
    private boolean isValidTarget() {
        return (category != null || event != null);
    }

    @AssertTrue(message = "Une règle de type LIST doit avoir des listValues non vides")
    private boolean isValidForListType() {
        if (valueType != RuleValueType.LIST) return true;
        return listValues != null && !listValues.isBlank();
    }

    @AssertTrue(message = "Une règle de type NUMBER doit avoir une numericValue")
    private boolean isValidForNumberType() {
        if (valueType != RuleValueType.NUMBER) return true;
        return numericValue != null;
    }

    @AssertTrue(message = "Une règle de type BOOLEAN doit avoir une booleanValue")
    private boolean isValidForBooleanType() {
        if (valueType != RuleValueType.BOOLEAN) return true;
        return booleanValue != null;
    }

    // ========== MÉTHODES UTILITAIRES ==========

    /**
     * Retourne la liste des valeurs pour les critères de type LIST
     */
    public java.util.List<String> getListValuesAsList() {
        if (listValues == null || listValues.isBlank()) return java.util.Collections.emptyList();
        return java.util.Arrays.asList(listValues.split(","));
    }

    /**
     * Vérifie si une valeur donnée est dans la liste autorisée
     */
    public boolean containsInList(String value) {
        if (value == null || listValues == null) return false;
        return getListValuesAsList().stream()
                .anyMatch(v -> v.equalsIgnoreCase(value.trim()));
    }
}