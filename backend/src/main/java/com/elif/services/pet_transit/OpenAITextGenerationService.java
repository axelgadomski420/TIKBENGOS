package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.request.AiGenerationRequestDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OpenAITextGenerationService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

    private static final String DESCRIPTION_SYSTEM_PROMPT = """
            You are a professional travel content writer for a pet-friendly travel platform.
            Write a clear, attractive, and informative destination description for admin use.
            It must be 3 to 5 sentences. Natural, polished, and engaging. No bullet points.
            """;

    private static final String SAFETY_TIPS_SYSTEM_PROMPT = """
            You are a pet travel safety expert writing for a professional travel admin platform.
            Write practical, clear safety tips for pet owners visiting this destination.
            Use 3 to 5 concise bullet points. Focus on real risks and useful advice.
            """;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-4o}")
    private String openAiModel;

    public OpenAITextGenerationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(30_000);
        this.restTemplate = new RestTemplate(requestFactory);
    }

    public String generateDescription(AiGenerationRequestDTO request) {
        return callOpenAi(DESCRIPTION_SYSTEM_PROMPT, buildUserPrompt(request));
    }

    public String generateSafetyTips(AiGenerationRequestDTO request) {
        return callOpenAi(SAFETY_TIPS_SYSTEM_PROMPT, buildUserPrompt(request));
    }

    private String callOpenAi(String systemPrompt, String userPrompt) {
        if (!StringUtils.hasText(openAiApiKey)) {
            throw new IllegalStateException("OPENAI_API_KEY is missing.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(openAiApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", openAiModel);
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        payload.put("max_tokens", 350);
        payload.put("temperature", 0.7);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    OPENAI_CHAT_COMPLETIONS_URL,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            return extractContent(response.getBody());
        } catch (RestClientException exception) {
            log.error("OpenAI API call failed.", exception);
            throw new IllegalStateException("OpenAI API call failed.", exception);
        }
    }

    private String extractContent(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            throw new IllegalStateException("OpenAI returned an empty response.");
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String content = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText("")
                    .trim();

            if (!StringUtils.hasText(content)) {
                throw new IllegalStateException("OpenAI response did not contain generated content.");
            }

            return content;
        } catch (Exception exception) {
            log.error("Failed to parse OpenAI response.", exception);
            throw new IllegalStateException("Failed to parse OpenAI response.", exception);
        }
    }

    private String buildUserPrompt(AiGenerationRequestDTO request) {
        List<String> promptParts = new ArrayList<>();

        String destinationLine = joinNonBlank(", ",
                request.getTitle(),
                request.getRegion(),
                request.getCountry()
        );

        if (StringUtils.hasText(destinationLine)) {
            promptParts.add("Destination: " + destinationLine + ".");
        }

        if (StringUtils.hasText(request.getDestinationType())) {
            promptParts.add("Type: " + request.getDestinationType().trim() + ".");
        }

        if (StringUtils.hasText(request.getTransport())) {
            promptParts.add("Transport: " + request.getTransport().trim() + ".");
        }

        if (request.getPetFriendlyLevel() != null) {
            promptParts.add("Pet-friendly level: " + request.getPetFriendlyLevel() + "/5.");
        }

        if (promptParts.isEmpty()) {
            return "Destination context is limited. Write realistic and helpful content for a pet-friendly destination.";
        }

        return String.join(" ", promptParts);
    }

    private String joinNonBlank(String delimiter, String... values) {
        List<String> parts = new ArrayList<>();
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                parts.add(value.trim());
            }
        }
        return String.join(delimiter, parts);
    }
}
