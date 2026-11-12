package com.elif.entities.events;

/**
 * Types d'interactions utilisateur, ordonnés par poids croissant.
 * Plus l'interaction révèle un intérêt fort, plus son poids est élevé.
 */
public enum InteractionType {

    /** Simple affichage dans la liste — intention faible */
    VIEW(1),

    /** Clic sur l'event depuis les résultats de recherche */
    SEARCH_CLICK(3),

    /** Ouverture de la page de détail */
    DETAIL_OPEN(5),

    /** Entrée en liste d'attente — intérêt fort mais bloqué */
    WAITLIST_JOIN(10),

    /** Avis laissé — preuve de participation réelle */
    REVIEW_POSTED(15),

    /** Inscription confirmée — signal d'engagement maximal */
    REGISTRATION(20);

    private final int weight;

    InteractionType(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return weight;
    }
}