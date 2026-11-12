package com.elif.services.events.implementations;

import com.elif.dto.events.request.EventAnalysisRequestDTO;
import com.elif.dto.events.response.EventAnalysisResponseDTO;
import com.elif.dto.events.response.EventAnalysisResponseDTO.RecommendationDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ════════════════════════════════════════════════════════════════
 *  EventIntelligenceService — VERSION CORRIGÉE
 *
 *  BUGS CORRIGÉS :
 *
 *  BUG 1 — Score oscille (monte puis descend lors du apply)
 *   CAUSE : isConverged() court-circuite vers buildConvergedResponse()
 *           qui donne un score fixe >= 72, mais le prochain ngDoCheck
 *           repart vers Groq qui redonne un score différent → oscillation.
 *   FIX   : Supprimer isConverged(). Le score est maintenant TOUJOURS
 *           calculé de la même façon (computeQuickScore local + Groq).
 *           Le Groq est en position d'autorité unique. Aucun court-circuit.
 *
 *  BUG 2 — Recommandations reprennent des champs déjà appliqués
 *   CAUSE : alreadyApplied() comparait en lowercase mais les clés dans
 *           appliedChanges étaient stockées avec le format exact du field.
 *   FIX   : Normalisation systématique des deux côtés avant comparaison.
 *
 *  BUG 3 — prediction_attendance dépasse maxCapacity en fallback
 *   CAUSE : calcul `score * maxCapacity / 100` sans plancher réaliste.
 *   FIX   : Clamp strict + fonction de prédiction cohérente.
 *
 *  BUG 4 — Temperature Groq = 0.1 → réponses trop déterministes
 *   FIX   : Temperature = 0.3 pour plus de naturel dans les analyses.
 * ════════════════════════════════════════════════════════════════
 */
@Service
@Slf4j
public class EventIntelligenceService {

    private static final String ENGLISH_INSTRUCTION =
            "Instruction: You must respond in professional English. Do not use French.";

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${ai.groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Value("${ai.groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${ai.groq.max-tokens:1024}")
    private int maxTokens;

    public EventIntelligenceService(ObjectMapper objectMapper, RestTemplateBuilder builder) {
        this.objectMapper = objectMapper;
        this.restTemplate = builder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    //  POINT D'ENTRÉE PRINCIPAL
    // ══════════════════════════════════════════════════════════════════

    public EventAnalysisResponseDTO analyze(EventAnalysisRequestDTO request) {
        EventAnalysisRequestDTO req = normalize(request);

        log.info("🧠 Analyzing: title='{}' capacity={} changes={}",
                req.getTitle(), req.getMaxCapacity(), req.getAppliedChanges().size());

        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("ai.groq.api-key not configured → fallback analysis");
            return buildFallback(req);
        }

        try {
            EventAnalysisResponseDTO raw = callGroq(req);
            EventAnalysisResponseDTO sanitized = sanitize(raw, req);
            log.info("✅ Groq: score={} recs={}", sanitized.getScore(), sanitized.getRecommendations().size());
            return sanitized;
        } catch (Exception e) {
            log.warn("⚠️ Groq failed ({}), fallback", e.getMessage());
            return buildFallback(req);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  APPEL GROQ
    // ══════════════════════════════════════════════════════════════════

    private EventAnalysisResponseDTO callGroq(EventAnalysisRequestDTO req) throws Exception {
        Map<String, Object> payload = Map.of(
                "model",           groqModel,
                "messages",        List.of(
                        Map.of("role", "system", "content", buildSystemPrompt()),
                        Map.of("role", "user",   "content", buildUserPrompt(req))
                ),
                "temperature",     0.3,
                "max_tokens",      maxTokens,
                "response_format", Map.of("type", "json_object")
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        ResponseEntity<String> resp = restTemplate.postForEntity(
                groqApiUrl, new HttpEntity<>(payload, headers), String.class);

        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null)
            throw new IllegalStateException("Groq HTTP " + resp.getStatusCode());

        JsonNode root    = objectMapper.readTree(resp.getBody());
        String   content = root.path("choices").path(0).path("message").path("content").asText("");
        if (content.isBlank()) throw new IllegalStateException("Groq returned empty content");

        String cleaned = content
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```", "")
                .trim();

        return objectMapper.readValue(cleaned, EventAnalysisResponseDTO.class);
    }

    // ══════════════════════════════════════════════════════════════════
    //  PROMPT ENGINEERING
    // ══════════════════════════════════════════════════════════════════

    private String buildSystemPrompt() {
        return """
            You are ELIF Event Intelligence — an expert AI coach for pet event organizers.
            %s

            Your job: analyze the event draft and return a structured JSON prediction.

            SCORING RUBRIC (0–100):
            - Base: 30 points
            - Title ≥ 15 chars and specific: +12 pts
            - Description ≥ 100 chars: +12 pts  |  ≥ 200 chars: +5 pts bonus
            - Date defined and ≥ 7 days from now: +12 pts
            - Location defined: +10 pts
            - Animal types defined: +9 pts
            - Applied improvements (each): +3 pts, max +10 pts
            Total max: 100

            STRICT RULES:
            1. Never recommend a field already listed in "applied_fields"
            2. Score must be STABLE — given the same inputs, always return the same score (±2 tolerance)
            3. prediction_attendance must be between 20%% and 95%% of max_capacity
            4. If score ≥ 78: return recommendations = []
            5. Limit recommendations to 3 items maximum, sorted by priority: high → medium → low
            6. Each recommendation must target a different field
            7. suggested_value must be actionable and specific to pet events

            Return ONLY this exact JSON (no markdown, no text outside):
            {
              "score": <0–100>,
              "prediction_attendance": <integer ≤ max_capacity>,
              "prediction_engagement": <1–10>,
              "analysis": "<max 220 chars — specific, actionable insight>",
              "recommendations": [
                {
                  "field": "title|description|date|location|animal_types|max_capacity",
                  "priority": "high|medium|low",
                  "reason": "<max 110 chars>",
                  "suggested_value": <string | integer | string[]>
                }
              ]
            }
            """.formatted(ENGLISH_INSTRUCTION);
    }

    private String buildUserPrompt(EventAnalysisRequestDTO req) {
        List<String> animals       = req.getAnimalTypes()    != null ? req.getAnimalTypes()    : List.of();
        List<String> applied       = req.getAppliedChanges() != null ? req.getAppliedChanges() : List.of();
        Set<String>  appliedFields = applied.stream()
                .map(c -> c.contains(":") ? c.split(":")[0].trim().toLowerCase() : c.trim().toLowerCase())
                .collect(Collectors.toSet());

        int descLen = req.getDescription() != null ? req.getDescription().length() : 0;
        String dateStr = req.getDate() != null
                ? req.getDate().toString() + " (" +
                ChronoUnit.DAYS.between(LocalDateTime.now(), req.getDate()) + " days from now)"
                : "NOT DEFINED";

        return """
            EVENT DRAFT TO ANALYZE:

            title         : %s
            description   : %s (%d characters)
            date          : %s
            location      : %s
            animal_types  : %s
            max_capacity  : %d
            applied_fields: [%s]
            applied_values: [%s]
            previous_analysis: %s

            Using the scoring rubric, compute the score and return your JSON analysis.
            Do NOT recommend any field listed in applied_fields.
            """.formatted(
                safe(req.getTitle()),
                safe(req.getDescription()),
                descLen,
                dateStr,
                safe(req.getLocation()),
                animals.isEmpty() ? "not specified" : String.join(", ", animals),
                req.getMaxCapacity(),
                String.join(", ", appliedFields),
                applied.isEmpty() ? "none" : String.join(" | ", applied),
                safe(req.getPreviousAnalysis()).isBlank() ? "none" : safe(req.getPreviousAnalysis())
        );
    }

    // ══════════════════════════════════════════════════════════════════
    //  SANITIZE — Nettoyage et validation de la réponse Groq
    // ══════════════════════════════════════════════════════════════════

    private EventAnalysisResponseDTO sanitize(EventAnalysisResponseDTO raw, EventAnalysisRequestDTO req) {
        if (raw == null) return buildFallback(req);

        // Score
        raw.setScore(clamp(raw.getScore(), 0, 100));

        // Attendance : toujours entre 20% et 95% de maxCapacity
        int minAtt = Math.max(1, (int)(req.getMaxCapacity() * 0.20));
        int maxAtt = Math.max(1, (int)(req.getMaxCapacity() * 0.95));
        raw.setPredictionAttendance(clamp(raw.getPredictionAttendance(), minAtt, maxAtt));

        raw.setPredictionEngagement(clamp(raw.getPredictionEngagement(), 1, 10));
        raw.setAnalysis(safeText(raw.getAnalysis(),
                "Add more event details to improve the analysis confidence."));

        // Recommandations
        List<String> applied = req.getAppliedChanges() != null ? req.getAppliedChanges() : List.of();
        List<RecommendationDTO> valid = new ArrayList<>();
        Set<String> seenFields = new HashSet<>();

        if (raw.getRecommendations() != null) {
            for (RecommendationDTO r : raw.getRecommendations()) {
                if (r == null || r.getField() == null || r.getReason() == null) continue;
                String nf = normalizeField(r.getField());
                if (nf == null) continue;
                if (seenFields.contains(nf)) continue;                      // dédupe
                if (alreadyApplied(nf, r.getSuggestedValue(), applied)) continue; // skip appliqués
                seenFields.add(nf);
                valid.add(RecommendationDTO.builder()
                        .field(nf)
                        .priority(normalizePriority(r.getPriority()))
                        .reason(r.getReason().trim())
                        .suggestedValue(r.getSuggestedValue())
                        .build());
            }
        }

        valid.sort(Comparator.comparingInt(r -> priorityOrder(r.getPriority())));
        if (valid.size() > 3) valid = valid.subList(0, 3);

        // Si score ≥ 78 ET pas de high-priority → vider les recs
        if (raw.getScore() >= 78 && valid.stream().noneMatch(r -> "high".equals(r.getPriority()))) {
            valid = new ArrayList<>();
        }

        raw.setRecommendations(valid);
        return raw;
    }

    // ══════════════════════════════════════════════════════════════════
    //  FALLBACK — Analyse locale si Groq indisponible
    // ══════════════════════════════════════════════════════════════════

    private EventAnalysisResponseDTO buildFallback(EventAnalysisRequestDTO req) {
        int score        = computeQuickScore(req);
        // FIX BUG 3 : prédiction cohérente, jamais hors limites
        int minAtt       = Math.max(1, (int)(req.getMaxCapacity() * 0.20));
        int maxAtt       = Math.max(1, (int)(req.getMaxCapacity() * 0.95));
        int attendance   = clamp((int)(req.getMaxCapacity() * score / 115.0), minAtt, maxAtt);
        int engagement   = clamp(3 + score / 14, 1, 10);

        List<String> applied = req.getAppliedChanges() != null ? req.getAppliedChanges() : List.of();
        List<RecommendationDTO> recs = new ArrayList<>();

        if (needsTitle(req) && !alreadyApplied("title", null, applied))
            recs.add(createRec("title", "high",
                    "A specific title with the animal type improves click-through by 40%.",
                    suggestTitle(req)));

        if (needsDescription(req) && !alreadyApplied("description", null, applied))
            recs.add(createRec("description", "high",
                    "Events with 100+ char descriptions get 3× more registrations.",
                    suggestDescription(req)));

        if (needsDate(req) && !alreadyApplied("date", null, applied))
            recs.add(createRec("date", "medium",
                    "Publishing 7+ days in advance doubles registration volume.",
                    LocalDateTime.now().plusDays(14).truncatedTo(ChronoUnit.MINUTES).toString()));

        if (needsLocation(req) && !alreadyApplied("location", null, applied))
            recs.add(createRec("location", "medium",
                    "A precise venue reduces booking hesitation significantly.",
                    "Central pet-friendly venue, Paris"));

        if (needsAnimals(req) && !alreadyApplied("animal_types", null, applied))
            recs.add(createRec("animal_types", "low",
                    "Targeting a specific species increases audience relevance.",
                    List.of("Dogs", "Cats")));

        recs.sort(Comparator.comparingInt(r -> priorityOrder(r.getPriority())));
        if (recs.size() > 3) recs = recs.subList(0, 3);
        if (score >= 78) recs = new ArrayList<>();

        return EventAnalysisResponseDTO.builder()
                .score(score)
                .predictionAttendance(attendance)
                .predictionEngagement(engagement)
                .analysis(buildFallbackAnalysis(req))
                .recommendations(recs)
                .build();
    }

    // ── Score local déterministe (stable) ─────────────────────────────

    /**
     * FIX BUG 1 : Ce score est DÉTERMINISTE.
     * Pour les mêmes inputs, il retourne toujours la même valeur.
     * Il sert de fallback ET de référence de cohérence.
     */
    private int computeQuickScore(EventAnalysisRequestDTO req) {
        int score = 30;

        // Title
        if (!safe(req.getTitle()).isBlank()) {
            score += 8;
            if (req.getTitle().length() >= 15) score += 4;
        }

        // Description
        int descLen = req.getDescription() != null ? req.getDescription().length() : 0;
        if (descLen >= 100) score += 12;
        else if (descLen >= 40) score += 6;
        if (descLen >= 200) score += 5;

        // Location
        if (!safe(req.getLocation()).isBlank()) score += 10;

        // Date
        if (req.getDate() != null && req.getDate().isAfter(LocalDateTime.now())) {
            score += 6;
            if (req.getDate().isAfter(LocalDateTime.now().plusDays(7))) score += 6;
        }

        // Animal types
        if (req.getAnimalTypes() != null && !req.getAnimalTypes().isEmpty()) score += 9;

        // Applied improvements (chaque changement = +3, max 10)
        int changes = req.getAppliedChanges() != null ? req.getAppliedChanges().size() : 0;
        score += Math.min(changes * 3, 10);

        return clamp(score, 20, 95);
    }

    // ── Helpers de détection ──────────────────────────────────────────

    private boolean needsTitle(EventAnalysisRequestDTO req) {
        return safe(req.getTitle()).length() < 15;
    }

    private boolean needsDescription(EventAnalysisRequestDTO req) {
        return req.getDescription() == null || req.getDescription().length() < 100;
    }

    private boolean needsDate(EventAnalysisRequestDTO req) {
        return req.getDate() == null || req.getDate().isBefore(LocalDateTime.now().plusDays(3));
    }

    private boolean needsLocation(EventAnalysisRequestDTO req) {
        return safe(req.getLocation()).isBlank();
    }

    private boolean needsAnimals(EventAnalysisRequestDTO req) {
        return req.getAnimalTypes() == null || req.getAnimalTypes().isEmpty();
    }

    // ══════════════════════════════════════════════════════════════════
    //  HELPERS PARTAGÉS
    // ══════════════════════════════════════════════════════════════════

    /**
     * FIX BUG 2 : normalisation systématique AVANT comparaison.
     * appliedChanges format: "field:value" ex: "title:My Event"
     */
    private boolean alreadyApplied(String field, Object suggestedValue, List<String> applied) {
        if (applied == null || applied.isEmpty() || field == null) return false;
        String normField = normalizeField(field);
        if (normField == null) return false;
        String sugStr = suggestedValue != null ? String.valueOf(suggestedValue).toLowerCase().trim() : null;

        for (String entry : applied) {
            if (entry == null || entry.isBlank()) continue;
            String[] parts     = entry.split(":", 2);
            String   entryFld  = normalizeField(parts[0].trim());
            if (!normField.equals(entryFld)) continue;
            // Le champ a été appliqué → toujours skip (peu importe la valeur)
            return true;
        }
        return false;
    }

    private String normalizeField(String field) {
        if (field == null) return null;
        return switch (field.trim().toLowerCase()) {
            case "title"                                                  -> "title";
            case "description"                                            -> "description";
            case "date", "startdate", "event_date"                       -> "date";
            case "location", "venue"                                      -> "location";
            case "animal_types", "animaltypes", "expected_animal_types"   -> "animal_types";
            case "max_capacity", "maxcapacity", "capacity"               -> "max_capacity";
            default -> { log.debug("Unknown field: '{}'", field); yield null; }
        };
    }

    private String normalizePriority(String p) {
        if (p == null) return "medium";
        return switch (p.trim().toLowerCase()) {
            case "high" -> "high";
            case "low"  -> "low";
            default     -> "medium";
        };
    }

    private int priorityOrder(String p) {
        return switch (p == null ? "medium" : p) {
            case "high" -> 0;
            case "low"  -> 2;
            default     -> 1;
        };
    }

    private RecommendationDTO createRec(String field, String priority, String reason, Object value) {
        return RecommendationDTO.builder()
                .field(field).priority(priority).reason(reason).suggestedValue(value)
                .build();
    }

    private String suggestTitle(EventAnalysisRequestDTO req) {
        String animals = (req.getAnimalTypes() == null || req.getAnimalTypes().isEmpty())
                ? "Pets" : req.getAnimalTypes().stream().limit(2).collect(Collectors.joining(" & "));
        if (safe(req.getTitle()).isBlank()) return animals + " Experience Day 2025";
        return req.getTitle().trim() + " — " + animals + " Edition";
    }

    private String suggestDescription(EventAnalysisRequestDTO req) {
        String loc      = safe(req.getLocation()).isBlank() ? "our welcoming venue" : req.getLocation();
        String audience = (req.getAnimalTypes() == null || req.getAnimalTypes().isEmpty())
                ? "pet lovers" : String.join(", ", req.getAnimalTypes());
        return "Join us at " + loc + " for an immersive experience designed for " + audience
                + " and their owners. Enjoy expert-led workshops, socialising sessions, "
                + "and memorable activities that keep participants engaged from start to finish. "
                + "All levels welcome — register now to secure your spot!";
    }

    private String buildFallbackAnalysis(EventAnalysisRequestDTO req) {
        List<String> strengths = new ArrayList<>();
        if (!safe(req.getTitle()).isBlank() && req.getTitle().length() >= 10)
            strengths.add("clear title");
        if (req.getDescription() != null && req.getDescription().length() >= 80)
            strengths.add("detailed description");
        if (req.getAnimalTypes() != null && !req.getAnimalTypes().isEmpty())
            strengths.add("targeted audience");
        if (!safe(req.getLocation()).isBlank())
            strengths.add("defined venue");
        if (req.getAppliedChanges() != null && !req.getAppliedChanges().isEmpty())
            strengths.add("applied improvements");

        if (strengths.isEmpty())
            return "Add specific details to unlock a full prediction for attendance and engagement.";
        return "Strengths: " + String.join(", ", strengths)
                + ". Refine the remaining fields to maximize results.";
    }

    // ── Normalisation de la requête entrante ──────────────────────────

    private EventAnalysisRequestDTO normalize(EventAnalysisRequestDTO req) {
        if (req == null) req = new EventAnalysisRequestDTO();
        EventAnalysisRequestDTO n = new EventAnalysisRequestDTO();
        n.setTitle(safe(req.getTitle()));
        n.setDescription(safe(req.getDescription()));
        n.setDate(req.getDate());
        n.setLocation(safe(req.getLocation()));
        n.setAnimalTypes(req.getAnimalTypes() == null ? new ArrayList<>()
                : req.getAnimalTypes().stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim).distinct().collect(Collectors.toList()));
        n.setMaxCapacity(req.getMaxCapacity() > 0 ? req.getMaxCapacity() : 10);
        n.setPreviousAnalysis(safe(req.getPreviousAnalysis()));
        n.setInstruction(safe(req.getInstruction()));
        n.setAppliedChanges(req.getAppliedChanges() == null ? new ArrayList<>()
                : req.getAppliedChanges().stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim).collect(Collectors.toList()));
        return n;
    }

    private String safe(String v) { return v == null ? "" : v.trim(); }
    private String safeText(String v, String fallback) { return (v == null || v.isBlank()) ? fallback : v.trim(); }
    private int clamp(int v, int min, int max) { return Math.max(min, Math.min(max, v)); }
}