package com.elif.entities.events;

public enum EventStatus {
    PLANNED,    // Événement planifié, places disponibles
    ONGOING,    // Événement en cours
    COMPLETED,  // Événement terminé
    CANCELLED,  // Événement annulé
    FULL        // Événement complet (plus de places)
}