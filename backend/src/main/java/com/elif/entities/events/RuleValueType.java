package com.elif.entities.events;

public enum RuleValueType {

    /** Liste de valeurs séparées par des virgules (ex: races, espèces, sexes) */
    LIST,

    /** Valeur numérique (ex: âge, poids, niveau) */
    NUMBER,

    /** Valeur booléenne (true/false) */
    BOOLEAN,

    /** Texte libre (ex: description particulière) */
    TEXT
}