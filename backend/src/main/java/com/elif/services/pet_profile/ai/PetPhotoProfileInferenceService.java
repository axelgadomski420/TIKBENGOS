package com.elif.services.pet_profile.ai;

import com.elif.dto.pet_profile.response.PetPhotoProfileAnalysisResponseDTO;
import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Slf4j
public class PetPhotoProfileInferenceService {

    private static final long MAX_IMAGE_SIZE_BYTES = 8L * 1024L * 1024L;
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai.gemini.enabled:true}")
    private boolean geminiEnabled;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    public PetPhotoProfileInferenceService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public PetPhotoProfileAnalysisResponseDTO inferProfileFromPhoto(MultipartFile file) {
        validateInput(file);

        try {
            String mimeType = file.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : file.getContentType();
            String encodedImage = Base64.getEncoder().encodeToString(file.getBytes());

            if (isGeminiConfigured()) {
                try {
                    return inferWithGemini(mimeType, encodedImage);
                } catch (HttpStatusCodeException geminiFailure) {
                    int status = geminiFailure.getStatusCode().value();
                    String body = sanitizeBody(geminiFailure.getResponseBodyAsString());
                    log.warn("Gemini request failed with status {} and body {}", status, body);
                    return buildFallbackResponse("Gemini request failed (HTTP " + status + "): " + body);
                } catch (Exception geminiFailure) {
                    log.warn("Gemini request failed before receiving a valid response", geminiFailure);
                    return buildFallbackResponse("Gemini request failed: " + sanitizeBody(geminiFailure.getMessage()));
                }
            }

            return buildFallbackResponse("No AI provider is configured. Set GEMINI_API_KEY.");
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read uploaded image. Please upload a valid image file.", ex);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            return buildFallbackResponse("Photo AI analysis is temporarily unavailable.");
        }
    }

    private PetPhotoProfileAnalysisResponseDTO inferWithGemini(String mimeType, String encodedImage) throws IOException {
        URI uri = UriComponentsBuilder
            .fromUriString(GEMINI_API_BASE + "/{model}:generateContent")
            .queryParam("key", geminiApiKey)
            .buildAndExpand(Map.of("model", geminiModel))
            .encode(StandardCharsets.UTF_8)
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(
                    Map.of("text", buildPrompt()),
                    Map.of("inline_data", Map.of(
                        "mime_type", mimeType,
                        "data", encodedImage
                    ))
                )
            )),
            "generationConfig", Map.of(
                "temperature", 0.2,
                "responseMimeType", "application/json"
            )
        );

        ResponseEntity<String> response = restTemplate.exchange(
            uri,
            HttpMethod.POST,
            new HttpEntity<>(requestBody, headers),
            String.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank()) {
            throw new IllegalStateException("Gemini did not return a usable analysis response.");
        }

        return mapGeminiResponse(response.getBody());
    }

    private PetPhotoProfileAnalysisResponseDTO mapGeminiResponse(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        String content = extractModelContent(root);
        if (content.isBlank()) {
            throw new IllegalArgumentException("Gemini response could not be parsed for profile suggestions.");
        }
        JsonNode profileJson = parseModelJson(content);

        PetSpecies species = parseSpecies(profileJson.path("species").asText(""));
        PetGender gender = parseGender(profileJson.path("gender").asText(""));

        return PetPhotoProfileAnalysisResponseDTO.builder()
                .species(species)
                .breed(cleanText(profileJson.path("breed").asText("")))
                .gender(gender)
                .suggestedName(cleanText(profileJson.path("suggestedName").asText("")))
                .estimatedAgeMonths(normalizeAgeMonths(profileJson.path("estimatedAgeMonths")))
                .estimatedWeightKg(normalizeWeight(profileJson.path("estimatedWeightKg")))
                .confidence(normalizeConfidence(profileJson.path("confidence")))
                .summary(cleanText(profileJson.path("summary").asText("")))
                .detectedTraits(readStringList(profileJson.path("detectedTraits")))
                .notes(readStringList(profileJson.path("notes")))
                .disclaimer("AI estimates may be inaccurate. Confirm pet details with a veterinarian or official records.")
                .sourceModel(geminiModel)
                .build();
    }

    private boolean isGeminiConfigured() {
        return geminiEnabled && geminiApiKey != null && !geminiApiKey.isBlank();
    }

    private boolean shouldReturnFallback(int statusCode, String responseText) {
        if (statusCode == 429 || statusCode >= 500) {
            return true;
        }

        String normalized = responseText == null ? "" : responseText.toLowerCase(Locale.ROOT);
        return normalized.contains("quota")
                || normalized.contains("resource_exhausted")
                || normalized.contains("rate limit")
                || normalized.contains("temporarily unavailable");
    }

    private String sanitizeBody(String value) {
        if (value == null || value.isBlank()) {
            return "No details provided by provider.";
        }

        String trimmed = value.trim().replaceAll("\\s+", " ");
        return trimmed.length() <= 280 ? trimmed : trimmed.substring(0, 280) + "...";
    }

    private PetPhotoProfileAnalysisResponseDTO buildFallbackResponse(String reason) {
        return PetPhotoProfileAnalysisResponseDTO.builder()
                .species(PetSpecies.OTHER)
                .breed(null)
                .gender(PetGender.UNKNOWN)
                .suggestedName(null)
                .estimatedAgeMonths(null)
                .estimatedWeightKg(null)
                .confidence(12)
                .summary("AI assistant fallback mode: review and fill the profile manually.")
                .detectedTraits(List.of())
                .notes(List.of(
                        reason,
                        "Manual profile mode is active.",
                        "Retry AI analysis later when provider quota is restored.",
                        "Generated at " + OffsetDateTime.now()
                ))
                .disclaimer("Automatic AI extraction is currently limited. Please verify all profile details manually.")
                .sourceModel("fallback-rules")
                .build();
    }

    private String extractModelContent(JsonNode root) {
        JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        String text = textNode.asText("").trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Gemini response could not be parsed for profile suggestions.");
        }
        return text;
    }

    private void validateInput(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please upload a pet photo for AI analysis.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are supported for AI profile generation.");
        }

        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Image is too large. Please upload an image up to 8MB.");
        }
    }

    private JsonNode parseModelJson(String rawContent) throws IOException {
        String normalized = rawContent.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```json", "");
            normalized = normalized.replaceFirst("^```", "");
            normalized = normalized.replaceFirst("```$", "");
            normalized = normalized.trim();
        }
        return objectMapper.readTree(normalized);
    }

    private String buildPrompt() {
        return "You are a pet profile extraction assistant. Analyze the photo and return ONLY valid JSON. " +
                "Do not add markdown, explanation, or extra keys. " +
                "If uncertain, still choose the closest enum and lower confidence. " +
                "Use these enums exactly: species=[DOG,CAT,BIRD,RABBIT,HAMSTER,FISH,REPTILE,OTHER], " +
                "gender=[MALE,FEMALE,UNKNOWN]. " +
                "Return schema: {\"species\":\"...\",\"breed\":\"...\",\"gender\":\"...\"," +
                "\"suggestedName\":\"...\",\"estimatedAgeMonths\":0,\"estimatedWeightKg\":0," +
                "\"confidence\":0,\"summary\":\"...\",\"detectedTraits\":[\"...\"],\"notes\":[\"...\"]}.";
    }

    private PetSpecies parseSpecies(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        try {
            return PetSpecies.valueOf(normalized);
        } catch (Exception ignored) {
            return PetSpecies.OTHER;
        }
    }

    private PetGender parseGender(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        try {
            return PetGender.valueOf(normalized);
        } catch (Exception ignored) {
            return PetGender.UNKNOWN;
        }
    }

    private Integer normalizeAgeMonths(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        int raw = node.asInt(-1);
        if (raw < 0 || raw > 360) {
            return null;
        }
        return raw;
    }

    private BigDecimal normalizeWeight(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        double raw = node.asDouble(-1d);
        if (raw <= 0 || raw > 200) {
            return null;
        }
        return BigDecimal.valueOf(raw).setScale(2, RoundingMode.HALF_UP);
    }

    private Integer normalizeConfidence(JsonNode node) {
        int raw = node == null || node.isNull() ? 55 : node.asInt(55);
        if (raw < 0) {
            return 0;
        }
        return Math.min(raw, 100);
    }

    private List<String> readStringList(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        return java.util.stream.StreamSupport.stream(node.spliterator(), false)
                .map(JsonNode::asText)
                .map(this::cleanText)
                .filter(text -> text != null && !text.isBlank())
                .limit(8)
                .toList();
    }

    private String cleanText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
