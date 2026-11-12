package com.elif.controllers.events;

import com.elif.dto.events.request.AiAssistantRequest;
import com.elif.dto.events.response.AiStreamChunkDto;
import com.elif.services.events.interfaces.IAiEventAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * ══════════════════════════════════════════════════════════════════
 *  AI EVENT ASSISTANT — Controller unifié (4 capacités)
 *
 *  /stream/smart-match  → Matching intelligent d'événements
 *  /stream/insights     → Analyse d'un événement spécifique
 *  /stream/advisor      → Conseiller général (questions ouvertes)
 *  /stream/compare      → Comparaison de 2+ événements
 * ══════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/events/ai/assistant")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AiEventAssistantController {

    private final IAiEventAssistantService assistantService;

    /**
     * Smart Match : trouve les meilleurs événements selon la query
     * Mode: SMART_MATCH
     */
    @PostMapping(value = "/stream/smart-match", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> streamSmartMatch(@Valid @RequestBody AiAssistantRequest request) {
        log.info("🎯 Smart Match — query='{}'", request.getQuery());
        return assistantService.streamSmartMatch(request);
    }

    /**
     * Event Insights : analyse approfondie d'un événement
     * Mode: INSIGHTS
     */
    @PostMapping(value = "/stream/insights", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> streamInsights(@Valid @RequestBody AiAssistantRequest request) {
        log.info("🔍 Event Insights — eventId={}", request.getTargetEventId());
        return assistantService.streamInsights(request);
    }

    /**
     * AI Advisor : répond à n'importe quelle question sur les événements/animaux
     * Mode: ADVISOR
     */
    @PostMapping(value = "/stream/advisor", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> streamAdvisor(@Valid @RequestBody AiAssistantRequest request) {
        log.info("💬 Advisor — query='{}'", request.getQuery());
        return assistantService.streamAdvisor(request);
    }

    /**
     * Compare : compare 2 ou plusieurs événements côte à côte
     * Mode: COMPARE
     */
    @PostMapping(value = "/stream/compare", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> streamCompare(@Valid @RequestBody AiAssistantRequest request) {
        log.info("⚖️ Compare — eventIds={}", request.getCompareEventIds());
        return assistantService.streamCompare(request);
    }

    /**
     * Health check / test stream
     */
    @GetMapping(value = "/test", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> testStream() {
        return Flux.just(
                new AiStreamChunkDto("token", "✅ AI Assistant is online"),
                new AiStreamChunkDto("done", "{\"status\":\"ok\",\"message\":\"ELIF AI Assistant v2.0 ready\"}")
        );
    }
}