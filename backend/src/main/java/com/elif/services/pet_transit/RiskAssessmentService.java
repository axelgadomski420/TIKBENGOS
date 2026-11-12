package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.response.RiskAssessmentResponse;
import com.elif.dto.pet_transit.response.RiskIssueDto;
import com.elif.entities.pet_transit.SafetyChecklist;
import com.elif.entities.pet_transit.TravelDocument;
import com.elif.entities.pet_transit.TravelPlan;
import com.elif.exceptions.pet_transit.TravelPlanNotFoundException;
import com.elif.repositories.pet_transit.SafetyChecklistRepository;
import com.elif.repositories.pet_transit.TravelDocumentRepository;
import com.elif.repositories.pet_transit.TravelPlanRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class RiskAssessmentService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

    private final TravelPlanRepository planRepo;
    private final TravelDocumentRepository docRepo;
    private final SafetyChecklistRepository checklistRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    public RiskAssessmentService(
            TravelPlanRepository planRepo,
            TravelDocumentRepository docRepo,
            SafetyChecklistRepository checklistRepo) {
        this.planRepo = planRepo;
        this.docRepo = docRepo;
        this.checklistRepo = checklistRepo;
    }

    public RiskAssessmentResponse assess(Long planId, Long userId) {

        TravelPlan plan = planRepo.findById(planId)
                .orElseThrow(() ->
                        new TravelPlanNotFoundException(
                                "Plan not found: " + planId));

        if (!plan.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Not authorized");
        }

        List<TravelDocument> documents =
                docRepo.findByTravelPlanId(planId);

        List<SafetyChecklist> checklist =
                checklistRepo.findByTravelPlanId(planId);

        long mandatoryTotal = checklist.stream()
                .filter(SafetyChecklist::isMandatory)
                .count();
        long mandatoryDone = checklist.stream()
                .filter(c -> c.isMandatory()
                        && c.isCompleted())
                .count();

        String petContext = buildPetContext(plan);
        String tripContext = buildTripContext(plan);
        String documentsContext =
                buildDocumentsContext(documents, plan);
        String checklistContext = String.format(
                "Mandatory checklist: %d/%d completed",
                mandatoryDone, mandatoryTotal);
        String cageContext = buildCageContext(plan);

        String prompt = buildPrompt(
                petContext, tripContext,
                documentsContext, checklistContext,
                cageContext,
                plan.getDestination().getCountry(),
                plan.getDestination().getTitle()
        );

        return callOpenAI(prompt);
    }

    private String buildPetContext(TravelPlan plan) {
        return String.format(
                "Pet weight: %s kg. Transport: %s.",
                plan.getAnimalWeight() != null
                        ? plan.getAnimalWeight() : "unknown",
                plan.getTransportType() != null
                        ? plan.getTransportType() : "unknown"
        );
    }

    private String buildTripContext(TravelPlan plan) {
        String daysUntilTravel = "unknown";
        if (plan.getTravelDate() != null) {
            long days = LocalDate.now().until(plan.getTravelDate()).getDays();
            daysUntilTravel = days + " days";
        }
        return String.format(
                "Origin: %s. Destination: %s, %s. Travel date: %s (%s until departure). Return date: %s.",
                plan.getOrigin() != null
                        ? plan.getOrigin() : "unknown",
                plan.getDestination().getTitle(),
                plan.getDestination().getCountry(),
                plan.getTravelDate() != null
                        ? plan.getTravelDate() : "not set",
                daysUntilTravel,
                plan.getReturnDate() != null
                        ? plan.getReturnDate() : "not set"
        );
    }

    private String buildDocumentsContext(List<TravelDocument> docs, TravelPlan plan) {
        Set<?> requiredDocsRaw =
                plan.getDestination().getRequiredDocuments();

        List<String> requiredDocs = requiredDocsRaw == null
                ? List.of()
                : requiredDocsRaw.stream()
                .map(String::valueOf)
                .collect(Collectors.toList());

        String requiredList = !requiredDocs.isEmpty()
                ? String.join(", ", requiredDocs)
                : "standard pet travel documents";

        if (docs.isEmpty()) {
            return "No documents uploaded yet. "
                    + "All required documents are MISSING. "
                    + "Required: " + requiredList;
        }

        List<String> validDocs = docs.stream()
                .filter(d -> d.getValidationStatus()
                        .toString().equals("VALID"))
                .map(d -> d.getDocumentType().toString())
                .collect(Collectors.toList());

        List<String> pendingDocs = docs.stream()
                .filter(d -> d.getValidationStatus()
                        .toString().equals("PENDING"))
                .map(d -> d.getDocumentType().toString()
                        + (d.getExpiryDate() != null
                        ? " (expires " + d.getExpiryDate() + ")"
                        : ""))
                .collect(Collectors.toList());

        List<String> rejectedDocs = docs.stream()
                .filter(d -> d.getValidationStatus()
                        .toString().equals("REJECTED"))
                .map(d -> d.getDocumentType().toString())
                .collect(Collectors.toList());

        List<String> expiredDocs = docs.stream()
                .filter(d -> d.getValidationStatus()
                        .toString().equals("EXPIRED"))
                .map(d -> d.getDocumentType().toString())
                .collect(Collectors.toList());

        List<String> uploadedTypes = docs.stream()
                .map(d -> d.getDocumentType().toString())
                .collect(Collectors.toList());

        List<String> missingDocs = requiredDocs.stream()
                .filter(req -> uploadedTypes.stream()
                        .noneMatch(uploaded ->
                                uploaded.equalsIgnoreCase(req)))
                .collect(Collectors.toList());

        StringBuilder context = new StringBuilder();
        context.append("Required documents: ")
                .append(requiredList).append(". ");

        if (!validDocs.isEmpty()) {
            context.append("VALIDATED by admin: ")
                    .append(String.join(", ", validDocs))
                    .append(" (these are confirmed OK). ");
        }

        if (!pendingDocs.isEmpty()) {
            context.append("UPLOADED and awaiting admin review: ")
                    .append(String.join(", ", pendingDocs))
                    .append(". IMPORTANT: these documents ARE ")
                    .append("uploaded by the client but not yet ")
                    .append("reviewed by admin - do NOT treat ")
                    .append("them as missing or critical issues. ")
                    .append("Treat them as NEUTRAL/OK for now. ");
        }

        if (!rejectedDocs.isEmpty()) {
            context.append("REJECTED by admin (must re-upload): ")
                    .append(String.join(", ", rejectedDocs))
                    .append(". These are CRITICAL issues. ");
        }

        if (!expiredDocs.isEmpty()) {
            context.append("EXPIRED documents: ")
                    .append(String.join(", ", expiredDocs))
                    .append(". These are CRITICAL issues. ");
        }

        if (!missingDocs.isEmpty()) {
            context.append("NOT YET UPLOADED (missing): ")
                    .append(String.join(", ", missingDocs))
                    .append(". These are CRITICAL issues. ");
        } else if (docs.size() >= requiredDocs.size()) {
            context.append("All required documents have ")
                    .append("been uploaded. ");
        }

        return context.toString();
    }

    private String buildCageContext(TravelPlan plan) {
        if (plan.getCageLength() == null) {
            return "Cage dimensions: not provided.";
        }
        return String.format(
                "Cage dimensions: %.0f x %.0f x %.0f cm. " +
                        "Animal weight: %s kg.",
                plan.getCageLength(),
                plan.getCageWidth(),
                plan.getCageHeight(),
                plan.getAnimalWeight() != null
                        ? plan.getAnimalWeight()
                        : "unknown"
        );
    }

    private String buildPrompt(
            String petContext, String tripContext,
            String documentsContext, String checklistContext,
            String cageContext,
            String destinationCountry,
            String destinationTitle) {

        return String.format("""
You are an expert pet travel compliance analyst.
Analyze this pet travel plan and identify risks.

=== TRIP DETAILS ===
%s

=== PET & TRANSPORT ===
%s

=== CAGE DETAILS ===
%s

=== DOCUMENTS ===
%s

=== PREPARATION ===
%s

=== YOUR TASK ===
Analyze ALL the above information and return
ONLY a valid JSON object with this exact structure.
No markdown. No explanation. JSON only.

{
  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
  "riskScore": number 0-100 (100 = maximum risk),
  "summary": "2-3 sentence summary of the overall
    travel readiness for this specific pet and trip",
  "criticalIssues": [
    {
      "issue": "specific problem title",
      "impact": "what happens if not fixed",
      "action": "exact step to fix this"
    }
  ],
  "warnings": [
    {
      "issue": "warning title",
      "impact": "potential consequence",
      "action": "recommended action"
    }
  ],
  "positives": [
    "what is already well prepared"
  ],
  "recommendations": [
    "prioritized action items in order"
  ],
  "estimatedReadyDate": "YYYY-MM-DD estimate
    of when the pet will be ready to travel
    based on actions needed",
  "confidenceLevel": 0.0 to 1.0
}

RULES:
- riskLevel LOW: all documents valid,
  checklist complete, cage ok
- riskLevel MEDIUM: some docs pending
  or checklist incomplete
- riskLevel HIGH: missing required documents,
  expired docs, cage issues, or < 7 days
  to travel with pending issues
- criticalIssues: problems that will cause
  trip rejection or animal harm
- warnings: problems that may cause issues
  but are not critical
- DOCUMENT STATUS RULES (very important):
- PENDING = uploaded by client, awaiting admin
  review. This is NORMAL. Do NOT flag as critical.
- MISSING = not uploaded at all. This IS critical.
- VALID = confirmed by admin. Best status.
- REJECTED = admin rejected it. This IS critical.
- EXPIRED = document expired. This IS critical.
- Only flag MISSING, REJECTED, EXPIRED documents
  as critical issues.
- PENDING documents should appear in positives
  or warnings at most, never critical.
- Be specific to %s regulations
  for pet entry from Tunisia
- Consider IATA cage standards for %s transport
- estimatedReadyDate: realistic date based
  on the actions needed
""",
                tripContext, petContext, cageContext,
                documentsContext, checklistContext,
                destinationCountry,
                destinationTitle != null ? destinationTitle : "plane"
        );
    }

    private RiskAssessmentResponse callOpenAI(String prompt) {

        if (!StringUtils.hasText(openAiApiKey)) {
            log.warn("[RISK] OPENAI_API_KEY is missing, returning fallback response.");
            return buildFallbackResponse();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            Map<String, Object> requestBody = Map.of(
                    "model", "gpt-4o",
                    "temperature", 0.3,
                    "max_tokens", 1500,
                    "messages", List.of(
                            Map.of(
                                    "role", "system",
                                    "content",
                                    "You are a pet travel risk analyst. Return only valid JSON. Be specific and actionable."
                            ),
                            Map.of(
                                    "role", "user",
                                    "content", prompt
                            )
                    )
            );

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response =
                    restTemplate.postForEntity(
                            OPENAI_CHAT_COMPLETIONS_URL,
                            entity,
                            Map.class
                    );

            Map body = response.getBody();
            if (body == null || body.get("choices") == null) {
                log.warn("[RISK] OpenAI response body is empty or malformed.");
                return buildFallbackResponse();
            }

            List choices = (List) body.get("choices");
            if (choices.isEmpty()) {
                log.warn("[RISK] OpenAI returned no choices.");
                return buildFallbackResponse();
            }

            Map choice = (Map) choices.get(0);
            Map message = (Map) choice.get("message");
            String content =
                    message != null ? (String) message.get("content") : null;

            if (!StringUtils.hasText(content)) {
                log.warn("[RISK] OpenAI content is empty.");
                return buildFallbackResponse();
            }

            content = content.trim();
            if (content.startsWith("```")) {
                content = content
                        .replaceAll("```json\\s*", "")
                        .replaceAll("```\\s*", "")
                        .trim();
            }

            Map<String, Object> parsed =
                    objectMapper.readValue(content, Map.class);

            return buildResponse(parsed);

        } catch (Exception e) {
            log.error("[RISK] OpenAI error: {}", e.getMessage());
            return buildFallbackResponse();
        }
    }

    @SuppressWarnings("unchecked")
    private RiskAssessmentResponse buildResponse(Map<String, Object> parsed) {

        List<Map<String, String>> criticalRaw =
                (List<Map<String, String>>)
                        parsed.getOrDefault("criticalIssues",
                                List.of());
        List<Map<String, String>> warningsRaw =
                (List<Map<String, String>>)
                        parsed.getOrDefault("warnings", List.of());

        List<RiskIssueDto> critical = criticalRaw
                .stream()
                .map(m -> RiskIssueDto.builder()
                        .issue(m.getOrDefault("issue", ""))
                        .impact(m.getOrDefault("impact", ""))
                        .action(m.getOrDefault("action", ""))
                        .build())
                .collect(Collectors.toList());

        List<RiskIssueDto> warnings = warningsRaw
                .stream()
                .map(m -> RiskIssueDto.builder()
                        .issue(m.getOrDefault("issue", ""))
                        .impact(m.getOrDefault("impact", ""))
                        .action(m.getOrDefault("action", ""))
                        .build())
                .collect(Collectors.toList());

        return RiskAssessmentResponse.builder()
                .riskLevel((String) parsed.getOrDefault(
                        "riskLevel", "MEDIUM"))
                .riskScore(Integer.valueOf(
                        parsed.getOrDefault(
                                "riskScore", 50).toString()))
                .summary((String) parsed.getOrDefault(
                        "summary", "Analysis completed."))
                .criticalIssues(critical)
                .warnings(warnings)
                .positives((List<String>)
                        parsed.getOrDefault("positives",
                                List.of()))
                .recommendations((List<String>)
                        parsed.getOrDefault("recommendations",
                                List.of()))
                .estimatedReadyDate(
                        (String) parsed.getOrDefault(
                                "estimatedReadyDate", null))
                .confidenceLevel(Double.valueOf(
                        parsed.getOrDefault(
                                        "confidenceLevel", 0.8)
                                .toString()))
                .fromCache(false)
                .build();
    }

    private RiskAssessmentResponse buildFallbackResponse() {
        return RiskAssessmentResponse.builder()
                .riskLevel("UNKNOWN")
                .riskScore(0)
                .summary("AI analysis is temporarily unavailable. Please review your documents and checklist manually.")
                .criticalIssues(List.of())
                .warnings(List.of())
                .positives(List.of())
                .recommendations(List.of(
                        "Ensure all required documents are uploaded and valid",
                        "Complete all mandatory checklist items",
                        "Verify cage dimensions meet transport requirements"
                ))
                .fromCache(false)
                .build();
    }
}
