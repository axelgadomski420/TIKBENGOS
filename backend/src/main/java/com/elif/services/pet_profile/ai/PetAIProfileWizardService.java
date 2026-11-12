package com.elif.services.pet_profile.ai;

import com.elif.dto.pet_profile.response.PetAIProfileWizardResponseDTO;
import com.elif.entities.pet_profile.enums.PetGender;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Enhanced AI service for step-by-step pet profile creation wizard.
 * Generates structured data for auto-filling forms without showing raw AI text.
 */
@Service
@Slf4j
public class PetAIProfileWizardService {

    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
    private static final long MAX_IMAGE_SIZE_BYTES = 8L * 1024L * 1024L;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai.gemini.enabled:true}")
    private boolean geminiEnabled;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    public PetAIProfileWizardService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public PetAIProfileWizardResponseDTO analyzeForWizard(MultipartFile file) {
        validateInput(file);

        try {
            String mimeType = file.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : file.getContentType();
            String encodedImage = Base64.getEncoder().encodeToString(file.getBytes());

            if (isGeminiConfigured()) {
                return analyzeWithGemini(mimeType, encodedImage);
            }

            return buildFallbackResponse();
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read uploaded image", ex);
        } catch (Exception ex) {
            log.error("AI wizard analysis failed", ex);
            return buildFallbackResponse();
        }
    }

    private PetAIProfileWizardResponseDTO analyzeWithGemini(String mimeType, String encodedImage) throws IOException {
        URI uri = UriComponentsBuilder
            .fromUriString(GEMINI_API_BASE + "/{model}:generateContent")
            .queryParam("key", geminiApiKey)
            .buildAndExpand(Map.of("model", geminiModel))
            .encode(StandardCharsets.UTF_8)
            .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String enhancedPrompt = buildEnhancedPrompt();

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(
                    Map.of("text", enhancedPrompt),
                    Map.of("inline_data", Map.of(
                        "mime_type", mimeType,
                        "data", encodedImage
                    ))
                )
            )),
            "generationConfig", Map.of(
                "temperature", 0.4,
                "topK", 32,
                "topP", 1,
                "maxOutputTokens", 2048
            )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        var response = restTemplate.postForEntity(uri, entity, String.class);

        return parseGeminiResponse(response.getBody());
    }

    private String buildEnhancedPrompt() {
        return """
            Analyze this pet photo and provide a comprehensive profile in JSON format.
            Be precise and structured. Return ONLY valid JSON, no markdown, no explanations.
            
            Required JSON structure:
            {
              "photoQuality": {
                "isGood": boolean,
                "feedback": "string",
                "petClearlyVisible": boolean,
                "multiplePets": boolean,
                "tips": "string or null"
              },
              "basicInfo": {
                "suggestedName": "string or null",
                "species": "DOG|CAT|BIRD|RABBIT|HAMSTER|FISH|REPTILE|OTHER",
                "breed": "string",
                "breedConfidence": "high|medium|low",
                "alternativeBreeds": ["string"],
                "gender": "MALE|FEMALE|UNKNOWN",
                "genderConfidence": "high|medium|low",
                "estimatedAgeMonths": number,
                "ageReasoning": "string"
              },
              "physical": {
                "estimatedWeightKg": number,
                "weightRange": "string",
                "sizeCategory": "small|medium|large|giant",
                "coatType": "short|medium|long|curly|wire",
                "coatColors": ["string"],
                "bodyCondition": "underweight|ideal|overweight",
                "distinctiveFeatures": ["string"]
              },
              "healthBehavior": {
                "healthStatus": "healthy|needs_checkup|concerns",
                "visibleConcerns": ["string"],
                "energyLevel": "low|moderate|high|very_high",
                "temperament": "calm|playful|alert|shy",
                "behavioralNotes": ["string"]
              },
              "recommendations": {
                "dailyCalories": number,
                "dietType": "puppy|adult|senior|weight_management",
                "exercise": ["string"],
                "grooming": ["string"],
                "healthChecks": ["string"],
                "specialCare": "string or null"
              },
              "confidence": number (0-100),
              "uncertainFields": ["string"]
            }
            
            Guidelines:
            - Be conservative with confidence scores
            - If unsure about breed, provide alternatives
            - Estimate age based on visible features (eyes, teeth, size, coat)
            - Provide actionable recommendations
            - Flag any health concerns you notice
            - Be specific with coat colors (e.g., "golden", "black and white", "tabby")
            """;
    }

    private PetAIProfileWizardResponseDTO parseGeminiResponse(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");
        
        if (candidates.isEmpty()) {
            return buildFallbackResponse();
        }

        String textContent = candidates.get(0)
            .path("content")
            .path("parts")
            .get(0)
            .path("text")
            .asText("");

        // Extract JSON from potential markdown code blocks
        String jsonContent = textContent;
        if (textContent.contains("```json")) {
            int start = textContent.indexOf("```json") + 7;
            int end = textContent.indexOf("```", start);
            if (end > start) {
                jsonContent = textContent.substring(start, end).trim();
            }
        } else if (textContent.contains("```")) {
            int start = textContent.indexOf("```") + 3;
            int end = textContent.indexOf("```", start);
            if (end > start) {
                jsonContent = textContent.substring(start, end).trim();
            }
        }

        JsonNode aiData = objectMapper.readTree(jsonContent);
        return buildWizardResponse(aiData);
    }

    private PetAIProfileWizardResponseDTO buildWizardResponse(JsonNode aiData) {
        JsonNode photoQuality = aiData.path("photoQuality");
        JsonNode basicInfo = aiData.path("basicInfo");
        JsonNode physical = aiData.path("physical");
        JsonNode healthBehavior = aiData.path("healthBehavior");
        JsonNode recommendations = aiData.path("recommendations");

        // Calculate date of birth from estimated age
        int ageMonths = basicInfo.path("estimatedAgeMonths").asInt(12);
        LocalDate estimatedDob = LocalDate.now().minusMonths(ageMonths);

        return PetAIProfileWizardResponseDTO.builder()
            .photoAnalysis(PetAIProfileWizardResponseDTO.PhotoAnalysisStep.builder()
                .photoQualityGood(photoQuality.path("isGood").asBoolean(true))
                .photoQualityFeedback(photoQuality.path("feedback").asText("Photo quality is acceptable"))
                .petClearlyVisible(photoQuality.path("petClearlyVisible").asBoolean(true))
                .multiplePetsDetected(photoQuality.path("multiplePets").asBoolean(false))
                .photoTips(photoQuality.path("tips").asText(null))
                .build())
            .basicInfo(PetAIProfileWizardResponseDTO.BasicInfoStep.builder()
                .suggestedName(basicInfo.path("suggestedName").asText(null))
                .species(parseSpecies(basicInfo.path("species").asText("OTHER")))
                .breed(basicInfo.path("breed").asText("Mixed Breed"))
                .breedConfidence(basicInfo.path("breedConfidence").asText("medium"))
                .alternativeBreeds(parseStringList(basicInfo.path("alternativeBreeds")))
                .gender(parseGender(basicInfo.path("gender").asText("UNKNOWN")))
                .genderConfidence(basicInfo.path("genderConfidence").asText("medium"))
                .estimatedDateOfBirth(estimatedDob)
                .ageEstimateReasoning(basicInfo.path("ageReasoning").asText("Based on visible features"))
                .build())
            .physicalCharacteristics(PetAIProfileWizardResponseDTO.PhysicalCharacteristicsStep.builder()
                .estimatedWeightKg(BigDecimal.valueOf(physical.path("estimatedWeightKg").asDouble(10.0)))
                .weightRange(physical.path("weightRange").asText("8-12 kg"))
                .sizeCategory(physical.path("sizeCategory").asText("medium"))
                .coatType(physical.path("coatType").asText("short"))
                .coatColors(parseStringList(physical.path("coatColors")))
                .bodyCondition(physical.path("bodyCondition").asText("ideal"))
                .distinctiveFeatures(parseStringList(physical.path("distinctiveFeatures")))
                .build())
            .healthBehavior(PetAIProfileWizardResponseDTO.HealthBehaviorStep.builder()
                .apparentHealthStatus(healthBehavior.path("healthStatus").asText("healthy"))
                .visibleHealthConcerns(parseStringList(healthBehavior.path("visibleConcerns")))
                .estimatedEnergyLevel(healthBehavior.path("energyLevel").asText("moderate"))
                .temperamentGuess(healthBehavior.path("temperament").asText("playful"))
                .behavioralNotes(parseStringList(healthBehavior.path("behavioralNotes")))
                .build())
            .recommendations(PetAIProfileWizardResponseDTO.RecommendationsStep.builder()
                .suggestedDailyCalories(recommendations.path("dailyCalories").asInt(800))
                .dietType(recommendations.path("dietType").asText("adult"))
                .exerciseRecommendations(parseStringList(recommendations.path("exercise")))
                .groomingNeeds(parseStringList(recommendations.path("grooming")))
                .healthCheckReminders(parseStringList(recommendations.path("healthChecks")))
                .specialCareNotes(recommendations.path("specialCare").asText(null))
                .build())
            .overallConfidence(aiData.path("confidence").asInt(75))
            .aiModel(geminiModel)
            .requiresUserReview(aiData.path("confidence").asInt(75) < 80)
            .uncertainFields(parseStringList(aiData.path("uncertainFields")))
            .build();
    }

    private PetAIProfileWizardResponseDTO buildFallbackResponse() {
        return PetAIProfileWizardResponseDTO.builder()
            .photoAnalysis(PetAIProfileWizardResponseDTO.PhotoAnalysisStep.builder()
                .photoQualityGood(true)
                .photoQualityFeedback("AI analysis unavailable")
                .petClearlyVisible(true)
                .multiplePetsDetected(false)
                .photoTips(null)
                .build())
            .basicInfo(PetAIProfileWizardResponseDTO.BasicInfoStep.builder()
                .suggestedName(null)
                .species(PetSpecies.OTHER)
                .breed("Unknown")
                .breedConfidence("low")
                .alternativeBreeds(List.of())
                .gender(PetGender.UNKNOWN)
                .genderConfidence("low")
                .estimatedDateOfBirth(LocalDate.now().minusYears(2))
                .ageEstimateReasoning("AI unavailable - please enter manually")
                .build())
            .physicalCharacteristics(PetAIProfileWizardResponseDTO.PhysicalCharacteristicsStep.builder()
                .estimatedWeightKg(BigDecimal.valueOf(10.0))
                .weightRange("Unknown")
                .sizeCategory("medium")
                .coatType("short")
                .coatColors(List.of())
                .bodyCondition("ideal")
                .distinctiveFeatures(List.of())
                .build())
            .healthBehavior(PetAIProfileWizardResponseDTO.HealthBehaviorStep.builder()
                .apparentHealthStatus("healthy")
                .visibleHealthConcerns(List.of())
                .estimatedEnergyLevel("moderate")
                .temperamentGuess("playful")
                .behavioralNotes(List.of())
                .build())
            .recommendations(PetAIProfileWizardResponseDTO.RecommendationsStep.builder()
                .suggestedDailyCalories(800)
                .dietType("adult")
                .exerciseRecommendations(List.of())
                .groomingNeeds(List.of())
                .healthCheckReminders(List.of())
                .specialCareNotes(null)
                .build())
            .overallConfidence(0)
            .aiModel("fallback")
            .requiresUserReview(true)
            .uncertainFields(List.of("all"))
            .build();
    }

    private void validateInput(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Photo file is required");
        }

        if (file.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Image size must be 8MB or less");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }
    }

    private boolean isGeminiConfigured() {
        return geminiEnabled && geminiApiKey != null && !geminiApiKey.isBlank();
    }

    private PetSpecies parseSpecies(String value) {
        try {
            return PetSpecies.valueOf(value.toUpperCase());
        } catch (Exception e) {
            return PetSpecies.OTHER;
        }
    }

    private PetGender parseGender(String value) {
        try {
            return PetGender.valueOf(value.toUpperCase());
        } catch (Exception e) {
            return PetGender.UNKNOWN;
        }
    }

    private List<String> parseStringList(JsonNode node) {
        List<String> result = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> {
                String text = item.asText("");
                if (!text.isBlank()) {
                    result.add(text);
                }
            });
        }
        return result;
    }
}
