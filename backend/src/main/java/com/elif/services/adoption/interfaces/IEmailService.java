package com.elif.services.adoption.interfaces;

import com.elif.entities.adoption.Contract;

/**
 * Interface pour le service d'envoi d'emails
 */
public interface IEmailService {

    /**
     * Envoyer un email HTML
     * @param to Destinataire
     * @param subject Sujet
     * @param htmlBody Corps HTML
     */
    void sendHtmlEmail(String to, String subject, String htmlBody);

    /**
     * Envoyer un email texte simple
     * @param to Destinataire
     * @param subject Sujet
     * @param textBody Corps texte
     */
    void sendTextEmail(String to, String subject, String textBody);

    /**
     * Envoyer un email de confirmation d'adoption approuvée
     * @param contract Le contrat d'adoption
     */
    void sendAdoptionApprovedEmail(Contract contract);
}