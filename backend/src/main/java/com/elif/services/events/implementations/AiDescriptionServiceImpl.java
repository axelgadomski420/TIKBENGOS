package com.elif.services.events.implementations;

import com.elif.dto.events.request.AiGenerationRequest;
import com.elif.dto.events.response.AiGenerationResponse;
import com.elif.dto.events.response.AiStreamChunkDto;
import com.elif.services.events.interfaces.IAiDescriptionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiDescriptionServiceImpl implements IAiDescriptionService {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${ai.groq.model:llama-3.1-8b-instant}")
    private String model;

    @Value("${ai.groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;

    @Value("${ai.groq.max-tokens:2048}")
    private Integer maxTokens;

    @Value("${ai.groq.temperature:0.7}")
    private Double temperature;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.ENGLISH);

    @Override
    public Flux<AiStreamChunkDto> generateDescriptionStream(AiGenerationRequest request) {
        return Flux.create(sink -> {
            try {
                AiGenerationResponse result = generateDescriptionSync(request);

                if (result.getText() == null || result.getText().isBlank()) {
                    sink.next(new AiStreamChunkDto("error", "No content generated. Check your API key."));
                    sink.complete();
                    return;
                }

                String[] words = result.getText().split("(?<=\\s)|(?=\\s)");
                for (String word : words) {
                    if (!word.isEmpty()) {
                        sink.next(new AiStreamChunkDto("token", word));
                    }
                }
                sink.next(new AiStreamChunkDto("done", ""));
                sink.complete();

            } catch (Exception e) {
                log.error("Stream error: {}", e.getMessage());
                sink.next(new AiStreamChunkDto("error", buildUserFriendlyError(e.getMessage())));
                sink.complete();
            }
        });
    }

    @Override
    public AiGenerationResponse generateDescriptionSync(AiGenerationRequest request) {
        long start = System.currentTimeMillis();

        // Vérifier la clé API
        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("⚠️ GROQ_API_KEY not set, using fallback");
            String fallback = buildFallbackDescription(request);
            return AiGenerationResponse.builder()
                    .text(fallback)
                    .wordCount(fallback.split("\\s+").length)
                    .charCount(fallback.length())
                    .elapsedSeconds((System.currentTimeMillis() - start) / 1000.0)
                    .tone(request.getTone())
                    .language(request.getLanguage())
                    .generatedAt(LocalDateTime.now())
                    .build();
        }

        String text = callGroqWithRetry(request, 2);

        long elapsed = System.currentTimeMillis() - start;
        return AiGenerationResponse.builder()
                .text(text)
                .wordCount(text.isBlank() ? 0 : text.split("\\s+").length)
                .charCount(text.length())
                .elapsedSeconds(elapsed / 1000.0)
                .tone(request.getTone())
                .language(request.getLanguage())
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private String callGroqWithRetry(AiGenerationRequest request, int maxRetries) {
        String url = apiUrl;
        String prompt = buildPrompt(request);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", new Object[]{
                        Map.of("role", "user", "content", prompt)
                },
                "temperature", temperature,
                "max_tokens", maxTokens
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                log.info("📝 Calling GROQ API for event: '{}' (attempt {}/{})",
                        request.getTitle(), attempt + 1, maxRetries + 1);

                ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

                if (!response.getStatusCode().is2xxSuccessful()) {
                    throw new RuntimeException("GROQ returned: " + response.getStatusCode());
                }

                JsonNode root = objectMapper.readTree(response.getBody());

                String text = root.path("choices").get(0).path("message").path("content").asText("");

                if (text.isBlank()) {
                    throw new RuntimeException("GROQ returned empty content.");
                }

                log.info("✅ GROQ generated {} chars for '{}'", text.length(), request.getTitle());
                return text.trim();

            } catch (RuntimeException e) {
                if (attempt == maxRetries) throw e;
                log.warn("Attempt {} failed: {}. Retrying...", attempt + 1, e.getMessage());
                try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            } catch (Exception e) {
                throw new RuntimeException("GROQ call failed: " + e.getMessage(), e);
            }
        }
        throw new RuntimeException("GROQ failed after " + maxRetries + " retries.");
    }

    private String buildFallbackDescription(AiGenerationRequest request) {
        String tone = request.getTone() != null ? request.getTone() : "professional";
        String title = request.getTitle();
        String location = request.getLocation() != null ? request.getLocation() : "the venue";

        if ("exciting".equals(tone)) {
            return String.format("""
                🎉 Get ready for %s, the most exciting pet event of the year!
                
                Join us at %s for an unforgettable day filled with joy, competitions, and amazing prizes.
                
                Don't wait — register now and secure your spot today!
                """, title, location);
        } else if ("friendly".equals(tone)) {
            return String.format("""
                🐾 We warmly invite you to %s, a wonderful event for all pet lovers.
                
                Come share precious moments with your furry friends at %s in a welcoming atmosphere.
                
                Register today and be part of our caring community!
                """, title, location);
        } else {
            return String.format("""
                %s is a premier event dedicated to celebrating the bond between pets and their owners.
                
                Taking place at %s, this professional event offers a unique experience for all participants.
                
                Secure your participation now and join us for this exceptional occasion.
                """, title, location);
        }
    }

    private String buildPrompt(AiGenerationRequest request) {
        String lang = "en".equals(request.getLanguage()) ? "English" : "French";
        String toneGuide = getToneInstructions(request.getTone());
        String dateText = formatDate(request.getStartDate());
        String durationText = computeDuration(request.getStartDate(), request.getEndDate());
        String rulesSection = buildRulesSection(request.getRules());
        String eventType = getEventType(request);
        String locationText = getLocationText(request);

        return """
            You are a professional event copywriter for a pet events platform.
            
            TASK: Write a compelling event description in %s.
            
            TONE:
            %s
            
            EVENT DETAILS:
            Title       : %s
            Category    : %s %s
            Type        : %s
            Location    : %s
            Date        : %s
            Duration    : %s
            Capacity    : %d participants
            
            %s
            
            REQUIREMENTS:
            • Write exactly 3 paragraphs, separated by blank lines
            • Paragraph 1 (Hook): 2-3 sentences that grab attention
            • Paragraph 2 (Experience): 2-3 sentences about the event experience
            • Paragraph 3 (CTA): 2 sentences to encourage registration
            • No markdown, no bullet points, no titles
            • Output ONLY the 3 paragraphs, nothing else
            """.formatted(
                lang, toneGuide,
                request.getTitle(),
                request.getCategoryIcon(), request.getCategoryName(),
                eventType, locationText, dateText, durationText,
                request.getMaxParticipants() != null ? request.getMaxParticipants() : 0,
                rulesSection);
    }

    private String getToneInstructions(String tone) {
        return switch (tone != null ? tone : "professional") {
            case "friendly"  -> "Warm, conversational, inclusive voice. Use contractions. Max 1 exclamation mark.";
            case "exciting"  -> "High-energy, competitive, motivational. Short punchy sentences mixed with longer builds.";
            default          -> "Professional, authoritative, precise. No contractions. No exclamation marks.";
        };
    }

    private String getEventType(AiGenerationRequest request) {
        if (Boolean.TRUE.equals(request.getIsCompetition()))
            return Boolean.TRUE.equals(request.getRequiresApproval()) ? "Competition with jury approval" : "Competition";
        return "General pet event";
    }

    private String getLocationText(AiGenerationRequest request) {
        if (Boolean.TRUE.equals(request.getIsOnline())) return "Online – Virtual session";
        return request.getLocation() != null ? request.getLocation() : "Location TBD";
    }

    private String formatDate(LocalDateTime date) {
        if (date == null) return "Date TBD";
        try { return DATE_FMT.format(date); } catch (Exception e) { return "Date TBD"; }
    }

    private String computeDuration(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) return "TBD";
        long minutes = ChronoUnit.MINUTES.between(start, end);
        if (minutes <= 0) return "TBD";
        long h = minutes / 60, m = minutes % 60;
        if (h == 0) return m + " minutes";
        return m == 0 ? h + " hour" + (h > 1 ? "s" : "") : h + "h " + m + "min";
    }

    private String buildRulesSection(List<AiGenerationRequest.RuleSummary> rules) {
        if (rules == null || rules.isEmpty()) return "No specific eligibility requirements.";
        StringBuilder sb = new StringBuilder("ELIGIBILITY RULES:\n");
        rules.stream().filter(r -> Boolean.TRUE.equals(r.getIsHard()))
                .forEach(r -> sb.append("• ").append(r.getLabel()).append(": ").append(r.getValue()).append("\n"));
        rules.stream().filter(r -> !Boolean.TRUE.equals(r.getIsHard()))
                .forEach(r -> sb.append("• [advisory] ").append(r.getLabel()).append(": ").append(r.getValue()).append("\n"));
        return sb.toString();
    }

    private String buildUserFriendlyError(String raw) {
        if (raw == null) return "Unknown error.";
        if (raw.contains("429") || raw.contains("rate limit"))
            return "Rate limit reached. Please wait a moment and retry.";
        if (raw.contains("Connection reset") || raw.contains("SocketException"))
            return "Network connection error. Check your internet connection and API key.";
        if (raw.contains("API key") || raw.contains("401") || raw.contains("403"))
            return "Invalid GROQ API key. Please check your configuration.";
        return "Generation failed: " + raw;
    }
}