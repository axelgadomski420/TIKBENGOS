package com.elif.entities.events;

public enum RuleCriteria {

    // === RACES ===
    /** Races autorisées (type: LIST) */
    ALLOWED_BREEDS,

    /** Races interdites (type: LIST) - Exemple: "PIT_BULL" */
    FORBIDDEN_BREEDS,

    // === ESPÈCE ===
    /** Espèces autorisées (type: LIST) - Exemple: "CHIEN,CHAT" */
    ALLOWED_SPECIES,

    // === ÂGE ===
    /** Âge minimum en mois (type: NUMBER) */
    MIN_AGE_MONTHS,

    /** Âge maximum en mois (type: NUMBER) */
    MAX_AGE_MONTHS,

    // === POIDS ===
    /** Poids minimum en kg (type: NUMBER) */
    MIN_WEIGHT_KG,

    /** Poids maximum en kg (type: NUMBER) */
    MAX_WEIGHT_KG,

    // === CERTIFICATS & DOCUMENTS ===
    /** Vaccination obligatoire (type: BOOLEAN) */
    VACCINATION_REQUIRED,

    /** Licence/pedigree obligatoire (LOF, etc.) (type: BOOLEAN) */
    LICENSE_REQUIRED,

    /** Certificat médical obligatoire (type: BOOLEAN) */
    MEDICAL_CERT_REQUIRED,

    // === SEXE ===
    /** Sexes autorisés (type: LIST) - Exemple: "MALE,FEMALE" */
    ALLOWED_SEXES,

    // === NIVEAU / EXPÉRIENCE ===
    /** Niveau d'expérience minimum (1-5) (type: NUMBER) */
    MIN_EXPERIENCE_LEVEL,

    // === LIMITES ===
    /** Nombre maximum de participants par même propriétaire (type: NUMBER) */
    MAX_PARTICIPANTS_PER_OWNER,

    /** Interdire plusieurs animaux du même propriétaire (type: BOOLEAN) */
    SAME_OWNER_RESTRICTION,

    // === COULEUR (cas spécifique) ===
    /** Couleurs autorisées (type: LIST) - Exemple: "NOIR,BLANC,MARRON" */
    ALLOWED_COLORS,

    /** Couleurs interdites (type: LIST) */
    FORBIDDEN_COLORS
}