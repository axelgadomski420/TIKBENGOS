package com.elif.services.events.implementations;

import com.elif.config.GroqConfig;
import com.elif.dto.events.request.AiAssistantRequest;
import com.elif.dto.events.response.AiStreamChunkDto;
import com.elif.entities.events.EventStatus;
import com.elif.repositories.events.EventRepository;
import com.elif.services.events.interfaces.IAiEventAssistantService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ══════════════════════════════════════════════════════════════════
 *  AiEventAssistantServiceImpl — SERVICE IA PROFESSIONNEL v2.0
 *
 *  Propulsé par Groq (llama-3.3-70b-versatile) — ultra rapide
 *
 *  4 MODES :
 *  1. SMART_MATCH  → Matching intelligent multi-critères
 *  2. INSIGHTS     → Analyse approfondie d'un événement
 *  3. ADVISOR      → Conseiller conversationnel multi-tour
 *  4. COMPARE      → Comparaison structurée côte-à-côte
 *
 *  ARCHITECTURE :
 *  - Chaque mode construit un prompt spécialisé
 *  - Groq répond en ~1-2s (vs 4-8s Gemini)
 *  - Fallback intelligent si Groq échoue
 *  - Historique conversationnel supporté (mode ADVISOR)
 * ══════════════════════════════════════════════════════════════════
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiEventAssistantServiceImpl implements IAiEventAssistantService {

    private final EventRepository eventRepository;
    private final ObjectMapper    objectMapper;
    private final GroqConfig      groqConfig;
    private final RestTemplate    restTemplate;

    // ══════════════════════════════════════════════════════════════
    //  MODE 1 : SMART MATCH
    // ══════════════════════════════════════════════════════════════

    @Override
    public Flux<AiStreamChunkDto> streamSmartMatch(AiAssistantRequest request) {
        List<Map<String, Object>> events = buildEventsContext(request);

        if (events.isEmpty()) {
            String noEvent = toJson(Map.of(
                    "summary", "No upcoming events found matching your criteria.",
                    "matches", List.of(),
                    "advice", "Try browsing all categories or check back later for new events."
            ));
            return Flux.just(new AiStreamChunkDto("done", noEvent));
        }

        log.info("🤖 Smart Match — query='{}', events={}", request.getQuery(), events.size());

        try {
            String systemPrompt = buildSmartMatchSystem();
            String userPrompt   = buildSmartMatchUser(request, events);
            String result       = callGroq(systemPrompt, userPrompt, null, 1200);

            return Flux.just(
                    new AiStreamChunkDto("token", "🔍 Analyzing " + events.size() + " events…"),
                    new AiStreamChunkDto("done",  result)
            );
        } catch (Exception e) {
            log.error("Smart match Groq error: {}", e.getMessage());
            return Flux.just(
                    new AiStreamChunkDto("token", "Using smart ranking…"),
                    new AiStreamChunkDto("done",  buildSmartMatchFallback(events, request))
            );
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  MODE 2 : INSIGHTS
    // ══════════════════════════════════════════════════════════════

    @Override
    public Flux<AiStreamChunkDto> streamInsights(AiAssistantRequest request) {
        if (request.getTargetEventId() == null) {
            return Flux.just(new AiStreamChunkDto("error", "No event ID provided for insights."));
        }

        var eventOpt = eventRepository.findById(request.getTargetEventId());
        if (eventOpt.isEmpty()) {
            return Flux.just(new AiStreamChunkDto("error", "Event not found."));
        }

        var event = eventOpt.get();
        Map<String, Object> eventData = buildEventDetail(event);

        log.info("🔍 Insights — eventId={}, title='{}'", event.getId(), event.getTitle());

        try {
            String systemPrompt = buildInsightsSystem();
            String userPrompt   = buildInsightsUser(request, eventData);
            String result       = callGroq(systemPrompt, userPrompt, null, 1500);

            return Flux.just(
                    new AiStreamChunkDto("token", "📊 Analyzing event data…"),
                    new AiStreamChunkDto("done",  result)
            );
        } catch (Exception e) {
            log.error("Insights Groq error: {}", e.getMessage());
            return Flux.just(new AiStreamChunkDto("error", "Could not analyze this event right now."));
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  MODE 3 : ADVISOR (conversationnel multi-tour)
    // ══════════════════════════════════════════════════════════════

    @Override
    public Flux<AiStreamChunkDto> streamAdvisor(AiAssistantRequest request) {
        if (request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            return Flux.just(new AiStreamChunkDto("error", "Please provide a question."));
        }

        // Contexte événements récents (5 max pour ne pas surcharger)
        List<Map<String, Object>> recentEvents = buildEventsContext(
                new AiAssistantRequest(null, null, request.getCategoryId(), 5,
                        null, null, null, null)
        );

        log.info("💬 Advisor — query='{}', history={}", request.getQuery(),
                request.getConversationHistory() != null ? request.getConversationHistory().size() : 0);

        try {
            String systemPrompt = buildAdvisorSystem(recentEvents);
            String userPrompt   = request.getQuery();
            String result       = callGroq(systemPrompt, userPrompt, request.getConversationHistory(), 800);

            return Flux.just(
                    new AiStreamChunkDto("token", "💭 Thinking…"),
                    new AiStreamChunkDto("done",  toJson(Map.of(
                            "type",    "advisor",
                            "message", result,
                            "followUpQuestions", generateFollowUps(request.getQuery())
                    )))
            );
        } catch (Exception e) {
            log.error("Advisor Groq error: {}", e.getMessage());
            return Flux.just(new AiStreamChunkDto("error", "The advisor is temporarily unavailable."));
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  MODE 4 : COMPARE
    // ══════════════════════════════════════════════════════════════

    @Override
    public Flux<AiStreamChunkDto> streamCompare(AiAssistantRequest request) {
        if (request.getCompareEventIds() == null || request.getCompareEventIds().size() < 2) {
            return Flux.just(new AiStreamChunkDto("error", "Please select at least 2 events to compare."));
        }

        List<Map<String, Object>> eventsToCompare = request.getCompareEventIds().stream()
                .limit(4)
                .map(id -> eventRepository.findById(id).orElse(null))
                .filter(Objects::nonNull)
                .map(this::buildEventDetail)
                .collect(Collectors.toList());

        if (eventsToCompare.size() < 2) {
            return Flux.just(new AiStreamChunkDto("error", "Could not find enough events to compare."));
        }

        log.info("⚖️ Compare — {} events", eventsToCompare.size());

        try {
            String systemPrompt = buildCompareSystem();
            String userPrompt   = buildCompareUser(request, eventsToCompare);
            String result       = callGroq(systemPrompt, userPrompt, null, 1500);

            return Flux.just(
                    new AiStreamChunkDto("token", "⚖️ Comparing events…"),
                    new AiStreamChunkDto("done",  result)
            );
        } catch (Exception e) {
            log.error("Compare Groq error: {}", e.getMessage());
            return Flux.just(new AiStreamChunkDto("error", "Could not compare these events right now."));
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  GROQ API CALL (compatible OpenAI /v1/chat/completions)
    // ══════════════════════════════════════════════════════════════

    private String callGroq(
            String systemPrompt,
            String userMessage,
            List<AiAssistantRequest.ConversationTurn> history,
            int maxTokens) throws Exception {

        String url = groqConfig.getApiUrl() + "/chat/completions";

        // Construction des messages
        List<Map<String, String>> messages = new ArrayList<>();

        // Système
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Historique conversationnel (mode advisor)
        if (history != null) {
            for (var turn : history) {
                messages.add(Map.of("role", turn.getRole(), "content", turn.getContent()));
            }
        }

        // Message utilisateur
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model",       groqConfig.getModel());
        body.put("messages",    messages);
        body.put("max_tokens",  maxTokens);
        body.put("temperature", 0.45);
        body.put("top_p",       0.9);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqConfig.getApiKey());

        ResponseEntity<String> response = restTemplate.postForEntity(
                url, new HttpEntity<>(body, headers), String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Groq error: " + response.getStatusCode());
        }

        var root = objectMapper.readTree(response.getBody());
        String text = root.path("choices").path(0)
                .path("message").path("content").asText("");

        if (text.isBlank()) throw new RuntimeException("Empty Groq response");

        // Nettoyer les balises markdown
        text = text.trim()
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .trim();

        // Valider le JSON (pour les modes qui retournent du JSON)
        try {
            objectMapper.readTree(text);
        } catch (Exception ignored) {
            // Mode advisor retourne du texte brut — c'est normal
        }

        long usage = root.path("usage").path("total_tokens").asLong(0);
        log.info("✅ Groq OK — {} chars, {} tokens", text.length(), usage);
        return text;
    }

    // ══════════════════════════════════════════════════════════════
    //  SYSTEM PROMPTS SPÉCIALISÉS
    // ══════════════════════════════════════════════════════════════

    private String buildSmartMatchSystem() {
        return """
            You are ELIF's expert event matchmaker for pet owners and their animals.
            You deeply understand animal behavior, pet sports, dog breeds, cat breeds, and event requirements.
            
            Your job: analyze user requests and rank events by true relevance.
            
            CRITICAL RULES:
                        - ALWAYS respond in ENGLISH only, regardless of the user's language
            - Consider: animal breed traits, energy level, owner experience, competition eligibility
            - Be specific and insightful in reasons — not generic
            - Score honestly: only give 85+ if it's genuinely perfect
            - Return ONLY valid JSON, no markdown, no explanation outside JSON
            
            SCORING GUIDE:
            90-100: Perfect match — exact breed/type fit, ideal level, available slots
            75-89:  Great match — strong fit with minor caveats  
            60-74:  Good match — worth considering, some constraints
            40-59:  Maybe — loosely relevant, user should check details
            <40: Do not include
            """;
    }

    private String buildSmartMatchUser(AiAssistantRequest request, List<Map<String, Object>> events) {
        String petCtx = request.getPetContext() != null
                ? "\nPET CONTEXT: " + request.getPetContext()
                : "";

        return """
            USER REQUEST: "%s"%s
            
            AVAILABLE EVENTS:
            %s
            
            Return ONLY this JSON structure:
            {
              "summary": "1-2 sentences summarizing best options in user's language",
              "matches": [
                {
                  "eventId": <id>,
                  "score": <0-100>,
                  "label": "<perfect|great|good|maybe>",
                  "reason": "2 specific sentences about why this fits",
                  "highlight": "The #1 thing that makes this event stand out",
                  "eligible": <true|false>,
                  "eligibilityNote": "Note about eligibility or null",
                  "tips": ["Tip 1 for this event", "Tip 2"]
                }
              ],
              "noMatchReason": "Only if matches is empty",
              "generalAdvice": "1 sentence of general advice for this type of search"
            }
            
            Max 5 matches, ordered by score. Only eventIds from the list above.
            """.formatted(request.getQuery(), petCtx, toJson(events));
    }

    private String buildInsightsSystem() {
        return """
            You are an expert event analyst for ELIF, a pet event platform.
            You provide deep, actionable insights about specific events.
            
            Your analysis should cover:
            - Who this event is REALLY for (specific pet types/breeds/levels)
            - Competitive difficulty and expectations
            - Practical logistics (what to bring, how to prepare)
            - Red flags or special requirements
            - Tips for first-timers vs experienced participants
            
            CRITICAL: Detect language from context and respond in that language.
            Return ONLY valid JSON.
            """;
    }

    private String buildInsightsUser(AiAssistantRequest request, Map<String, Object> eventData) {
        String petCtx = request.getPetContext() != null
                ? "USER'S PET: " + request.getPetContext() + "\n"
                : "";
        String query = request.getQuery() != null
                ? "USER'S QUESTION: " + request.getQuery() + "\n"
                : "";

        return """
            %s%s
            EVENT DATA:
            %s
            
            Return ONLY this JSON:
            {
              "eventName": "<name>",
              "tldr": "One sentence summary",
              "targetAudience": {
                "idealFor": ["type1", "type2"],
                "notSuitableFor": ["type1"],
                "experienceLevel": "<beginner|intermediate|advanced|all>"
              },
              "logistics": {
                "preparation": ["Tip 1", "Tip 2", "Tip 3"],
                "whatToBring": ["Item 1", "Item 2"],
                "duration": "Estimated duration",
                "format": "Event format description"
              },
              "competitiveAnalysis": {
                "isCompetition": <true|false>,
                "difficultyLevel": "<low|medium|high>",
                "scoringCriteria": "How participants are scored (if applicable)",
                "prizes": "Prize information if mentioned"
              },
              "eligibilityCheck": {
                "personalizedResult": "<eligible|needs_check|not_eligible>",
                "requirements": ["Req 1", "Req 2"],
                "notes": "Personalized note based on pet context"
              },
              "insightScore": <0-100>,
              "mustKnow": "The single most important thing about this event",
              "sentiment": "<exciting|challenging|relaxed|competitive|educational>"
            }
            """.formatted(query, petCtx, toJson(eventData));
    }

    private String buildAdvisorSystem(List<Map<String, Object>> recentEvents) {
        String eventsCtx = recentEvents.isEmpty() ? "No recent events available." : toJson(recentEvents);

        return """
            You are Elif, a friendly and knowledgeable AI assistant for a pet events platform.
            You help pet owners find the best events for their animals.
            
            You can help with:
            - Finding suitable events for specific pet breeds/ages/levels
            - Explaining what different event types involve
            - Preparing pets and owners for events
            - Understanding competition rules and eligibility
            - General advice about pet sports and activities
            
            PERSONALITY: Warm, expert, concise. Like a knowledgeable friend who loves animals.
            LANGUAGE: Always respond in the same language as the user's question.
            FORMAT: Respond in plain text, conversational. Use line breaks for readability.
            Do NOT return JSON for this mode — return natural text.
            
            CURRENT UPCOMING EVENTS (for context):
            %s
            """.formatted(eventsCtx);
    }

    private String buildCompareSystem() {
        return """
            You are an expert event comparison analyst for ELIF pet events platform.
            You provide clear, structured side-by-side comparisons to help users choose.
            
            Be objective, highlight genuine differences, and give a clear recommendation.
            Detect user's language and respond accordingly.
            Return ONLY valid JSON.
            """;
    }

    private String buildCompareUser(AiAssistantRequest request, List<Map<String, Object>> events) {
        String petCtx = request.getPetContext() != null
                ? "COMPARING FOR: " + request.getPetContext() + "\n"
                : "";

        return """
            %s
            EVENTS TO COMPARE:
            %s
            
            Return ONLY this JSON:
            {
              "summary": "Brief comparison overview in user's language",
              "events": [
                {
                  "eventId": <id>,
                  "name": "<title>",
                  "pros": ["Pro 1", "Pro 2", "Pro 3"],
                  "cons": ["Con 1", "Con 2"],
                  "bestFor": "Who this is best for",
                  "score": <0-100>,
                  "uniqueFactor": "What makes this event stand out vs the others"
                }
              ],
              "winner": {
                "eventId": <id>,
                "reason": "Why this is the recommended choice"
              },
              "ifUndecided": "Practical advice to help make the final decision",
              "verdict": "<event1_title> vs <event2_title>: <one_line_verdict>"
            }
            """.formatted(petCtx, toJson(events));
    }

    // ══════════════════════════════════════════════════════════════
    //  CONTEXT BUILDERS
    // ══════════════════════════════════════════════════════════════

    private List<Map<String, Object>> buildEventsContext(AiAssistantRequest request) {
        int limit = Math.min(request.getMaxEvents(), 20);

        return eventRepository.findAll(PageRequest.of(0, limit * 2))
                .getContent()
                .stream()
                .filter(e -> e.getStatus() == EventStatus.PLANNED || e.getStatus() == EventStatus.FULL)
                .filter(e -> e.getStartDate().isAfter(LocalDateTime.now()))
                .filter(e -> request.getCategoryId() == null
                        || (e.getCategory() != null && e.getCategory().getId().equals(request.getCategoryId())))
                .limit(limit)
                .map(e -> {
                    Map<String, Object> ctx = new LinkedHashMap<>();
                    ctx.put("id",             e.getId());
                    ctx.put("title",          e.getTitle());
                    ctx.put("category",       e.getCategory() != null ? e.getCategory().getName() : "General");
                    ctx.put("isCompetition",  e.getCategory() != null && Boolean.TRUE.equals(e.getCategory().getCompetitionMode()));
                    ctx.put("requiresApproval", e.getCategory() != null && Boolean.TRUE.equals(e.getCategory().getRequiresApproval()));
                    ctx.put("location",       e.getLocation());
                    ctx.put("isOnline",       Boolean.TRUE.equals(e.getIsOnline()));
                    ctx.put("date",           e.getStartDate().toString());
                    ctx.put("slotsLeft",      e.getRemainingSlots());
                    ctx.put("totalSlots",     e.getMaxParticipants());
                    ctx.put("fillRate",       e.getMaxParticipants() > 0
                            ? Math.round(((double)(e.getMaxParticipants() - e.getRemainingSlots()) / e.getMaxParticipants()) * 100)
                            : 0);
                    ctx.put("description",    e.getDescription() != null
                            ? e.getDescription().substring(0, Math.min(200, e.getDescription().length()))
                            : "");
                    ctx.put("status",         e.getStatus().name());
                    ctx.put("avgRating",      Math.round(e.getAverageRating() * 10.0) / 10.0);
                    ctx.put("popularityScore", e.getAnalyticsPopularityScore());
                    return ctx;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildEventDetail(com.elif.entities.events.Event event) {
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("id",            event.getId());
        ctx.put("title",         event.getTitle());
        ctx.put("description",   event.getDescription());
        ctx.put("category",      event.getCategory() != null ? event.getCategory().getName() : "General");
        ctx.put("categoryDescription", event.getCategory() != null ? event.getCategory().getDescription() : null);
        ctx.put("isCompetition", event.getCategory() != null && Boolean.TRUE.equals(event.getCategory().getCompetitionMode()));
        ctx.put("requiresApproval", event.getCategory() != null && Boolean.TRUE.equals(event.getCategory().getRequiresApproval()));
        ctx.put("location",      event.getLocation());
        ctx.put("isOnline",      Boolean.TRUE.equals(event.getIsOnline()));
        ctx.put("startDate",     event.getStartDate().toString());
        ctx.put("endDate",       event.getEndDate().toString());
        ctx.put("maxParticipants", event.getMaxParticipants());
        ctx.put("remainingSlots", event.getRemainingSlots());
        ctx.put("isFull",        event.isFull());
        ctx.put("status",        event.getStatus().name());
        ctx.put("avgRating",     Math.round(event.getAverageRating() * 10.0) / 10.0);
        ctx.put("analyticsViews", event.getAnalyticsViews());
        ctx.put("analyticsEngagement", event.getAnalyticsEngagement());
        ctx.put("eligibilityRules", event.getEligibilityRules() != null
                ? event.getEligibilityRules().stream()
                .filter(r -> r.isActive())
                .map(r -> Map.of(
                        "criteria", r.getCriteria().name(),
                        "valueType", r.getValueType().name(),
                        "values",   r.getListValues() != null ? r.getListValues() : "",
                        "hardReject", r.isHardReject(),
                        "message",  r.getRejectionMessage() != null ? r.getRejectionMessage() : ""
                ))
                .collect(Collectors.toList())
                : List.of());
        return ctx;
    }

    // ══════════════════════════════════════════════════════════════
    //  FALLBACK SMART MATCH
    // ══════════════════════════════════════════════════════════════

    private String buildSmartMatchFallback(List<Map<String, Object>> events, AiAssistantRequest request) {
        String queryLower = request.getQuery() != null ? request.getQuery().toLowerCase() : "";

        List<Map<String, Object>> matches = events.stream()
                .map(e -> {
                    String title    = String.valueOf(e.getOrDefault("title", "")).toLowerCase();
                    String category = String.valueOf(e.getOrDefault("category", "")).toLowerCase();
                    boolean isComp  = Boolean.TRUE.equals(e.get("isCompetition"));
                    int fillRate    = e.get("fillRate") instanceof Number ? ((Number) e.get("fillRate")).intValue() : 0;

                    int score = 50;
                    if (title.contains(queryLower) || queryLower.contains(title.substring(0, Math.min(5, title.length())))) score += 25;
                    if (queryLower.contains(category)) score += 20;
                    if (isComp && queryLower.contains("competition")) score += 15;
                    if (fillRate < 50) score += 5; // bonus slots disponibles
                    score = Math.min(score, 92);

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("eventId",  e.get("id"));
                    m.put("score",    score);
                    m.put("label",    score >= 85 ? "perfect" : score >= 70 ? "great" : "good");
                    m.put("reason",   "This event matches your search based on category and availability.");
                    m.put("highlight", "Available with " + e.get("slotsLeft") + " slots remaining.");
                    m.put("eligible", true);
                    m.put("eligibilityNote", null);
                    m.put("tips",     List.of("Check the event description for full details."));
                    return m;
                })
                .filter(m -> (int) m.get("score") >= 50)
                .sorted((a, b) -> Integer.compare((int) b.get("score"), (int) a.get("score")))
                .limit(4)
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary",       "Here are the best available events matching your search.");
        result.put("matches",       matches);
        result.put("generalAdvice", "Check event details and eligibility requirements before registering.");
        return toJson(result);
    }

    // ══════════════════════════════════════════════════════════════
    //  FOLLOW-UP SUGGESTIONS (Advisor mode)
    // ══════════════════════════════════════════════════════════════

    private List<String> generateFollowUps(String query) {
        String q = query != null ? query.toLowerCase() : "";

        if (q.contains("agility") || q.contains("competition"))
            return List.of("What level of training is needed?", "Are there age restrictions?", "How do I register?");
        if (q.contains("beginner") || q.contains("first"))
            return List.of("What should I expect at my first event?", "What to bring?", "Are dogs of any breed welcome?");
        if (q.contains("cat") || q.contains("chat"))
            return List.of("What cat events are available?", "How to prepare my cat?", "Are indoor cats eligible?");
        return List.of("Show me upcoming events", "What categories are available?", "How to prepare my pet?");
    }

    // ══════════════════════════════════════════════════════════════
    //  UTILITIES
    // ══════════════════════════════════════════════════════════════

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "{}"; }
    }
}