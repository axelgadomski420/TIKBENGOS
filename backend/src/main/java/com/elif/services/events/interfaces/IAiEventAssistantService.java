package com.elif.services.events.interfaces;

import com.elif.dto.events.request.AiAssistantRequest;
import com.elif.dto.events.response.AiStreamChunkDto;
import reactor.core.publisher.Flux;

/**
 * Interface du service IA unifié — 4 capacités
 */
public interface IAiEventAssistantService {

    /**
     * Smart Match : trouve et classe les meilleurs événements
     */
    Flux<AiStreamChunkDto> streamSmartMatch(AiAssistantRequest request);

    /**
     * Insights : analyse approfondie d'un événement
     */
    Flux<AiStreamChunkDto> streamInsights(AiAssistantRequest request);

    /**
     * Advisor : réponse libre à une question sur les événements/animaux
     */
    Flux<AiStreamChunkDto> streamAdvisor(AiAssistantRequest request);

    /**
     * Compare : comparaison structurée de plusieurs événements
     */
    Flux<AiStreamChunkDto> streamCompare(AiAssistantRequest request);
}