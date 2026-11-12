package com.elif.services.events.interfaces;

public interface IEventExportService {
    /** Export CSV des participants confirmés d'un événement */
    byte[] exportParticipantsCsv(Long eventId);

    /** Export CSV récapitulatif de tous les événements */
    byte[] exportEventsCsv();
}
