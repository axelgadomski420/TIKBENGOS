package com.elif.controllers.pet_transit;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/speech")
@CrossOrigin(origins = "http://localhost:4200")
public class AzureSpeechController {

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getSpeechConfig() {
        String subscriptionKey = System.getenv("AZURE_SPEECH_KEY");
        String region = System.getenv("AZURE_SPEECH_REGION");

        if (subscriptionKey == null || region == null || subscriptionKey.isBlank() || region.isBlank()) {
            return ResponseEntity.status(503)
                .body(Map.of("error", "Speech service not configured."));
        }

        String tokenUrl = "https://" + region + ".api.cognitive.microsoft.com/sts/v1.0/issuetoken";

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Ocp-Apim-Subscription-Key", subscriptionKey);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<String> request = new HttpEntity<>("", headers);
            ResponseEntity<String> tokenResponse = restTemplate.exchange(tokenUrl, HttpMethod.POST, request, String.class);
            String token = tokenResponse.getBody();

            return ResponseEntity.ok(Map.of(
                "token", token != null ? token : "",
                "region", region,
                "language", "fr-FR"
            ));
        } catch (RestClientException e) {
            return ResponseEntity.status(500)
                .body(Map.of("error", "Failed to get Azure token: " + e.getMessage()));
        }
    }
}