package com.elif.controllers.pet_transit;

import com.elif.dto.pet_transit.request.AiGenerationRequestDTO;
import com.elif.dto.pet_transit.response.AiGenerationResponseDTO;
import com.elif.services.pet_transit.OpenAITextGenerationService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/transit/destinations")
@AllArgsConstructor
@Slf4j
public class AdminTransitDestinationAiController {

    private static final String TARGET_DESCRIPTION = "DESCRIPTION";
    private static final String TARGET_SAFETY_TIPS = "SAFETY_TIPS";
    private static final String TARGET_BOTH = "BOTH";

    private final OpenAITextGenerationService openAITextGenerationService;

    @PostMapping("/generate-content")
    public AiGenerationResponseDTO generateContent(@RequestBody AiGenerationRequestDTO request) {
        AiGenerationResponseDTO response = new AiGenerationResponseDTO();

        log.info(
                "AI generation request received: target={}, title={}, country={}, region={}, destinationType={}, transport={}, petFriendlyLevel={}",
                request != null ? safeLogValue(request.getTarget()) : "<null>",
                request != null ? safeLogValue(request.getTitle()) : "<null>",
                request != null ? safeLogValue(request.getCountry()) : "<null>",
                request != null ? safeLogValue(request.getRegion()) : "<null>",
                request != null ? safeLogValue(request.getDestinationType()) : "<null>",
                request != null ? safeLogValue(request.getTransport()) : "<null>",
                request != null ? request.getPetFriendlyLevel() : null
        );

        try {
            if (request == null) {
                throw new IllegalArgumentException("Request body is required.");
            }

            String target = normalizeTarget(request.getTarget());

            if (TARGET_DESCRIPTION.equals(target) || TARGET_BOTH.equals(target)) {
                response.setDescription(openAITextGenerationService.generateDescription(request));
            }

            if (TARGET_SAFETY_TIPS.equals(target) || TARGET_BOTH.equals(target)) {
                response.setSafetyTips(openAITextGenerationService.generateSafetyTips(request));
            }

            response.setErrorMessage(null);
        } catch (IllegalArgumentException exception) {
            log.error("AI generation request validation failed.", exception);
            response.setErrorMessage(exception.getMessage());
        } catch (IllegalStateException exception) {
            log.warn("AI generation failed due to service state/configuration: {}", exception.getMessage());
            response.setErrorMessage(resolveClientErrorMessage(exception));
        } catch (Exception exception) {
            log.error("AI generation failed.", exception);
            response.setErrorMessage("AI generation failed. Please try again.");
        }

        log.info(
                "AI generation response sent: hasDescription={}, hasSafetyTips={}, errorMessage={}",
                StringUtils.hasText(response.getDescription()),
                StringUtils.hasText(response.getSafetyTips()),
                safeLogValue(response.getErrorMessage())
        );
        return response;
    }

    private String normalizeTarget(String rawTarget) {
        if (!StringUtils.hasText(rawTarget)) {
            throw new IllegalArgumentException("Invalid target. Allowed values: DESCRIPTION, SAFETY_TIPS, BOTH.");
        }

        String normalizedTarget = rawTarget.trim().toUpperCase();
        if (!TARGET_DESCRIPTION.equals(normalizedTarget)
                && !TARGET_SAFETY_TIPS.equals(normalizedTarget)
                && !TARGET_BOTH.equals(normalizedTarget)) {
            throw new IllegalArgumentException("Invalid target. Allowed values: DESCRIPTION, SAFETY_TIPS, BOTH.");
        }
        return normalizedTarget;
    }

    private String safeLogValue(String value) {
        if (!StringUtils.hasText(value)) {
            return "<empty>";
        }
        return value.trim();
    }

    private String resolveClientErrorMessage(IllegalStateException exception) {
        String message = exception.getMessage();
        if (!StringUtils.hasText(message)) {
            return "AI generation failed. Please try again.";
        }

        if (message.contains("OPENAI_API_KEY")) {
            return "AI service is not configured. Set OPENAI_API_KEY in backend environment.";
        }

        return "AI generation failed. Please try again.";
    }
}
