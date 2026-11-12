package com.elif.entities.events;

public enum VirtualSessionStatus {
    SCHEDULED,  // Salle créée, pas encore ouverte
    OPEN,       // Salle ouverte, participants peuvent rejoindre
    CLOSED,     // Salle fermée, traitement des présences en cours
    ARCHIVED    // Traitement terminé, certificats générés
}
