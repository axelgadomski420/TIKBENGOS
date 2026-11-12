package com.elif.services.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class PetDescriptionGeneratorService {

    private final String apiKey;
    private final HttpClient httpClient;

    public PetDescriptionGeneratorService(@Value("${groq.api-key:${ai.groq.api-key:${app.ai.groq.api-key:}}}") String apiKey) {
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String generateDescription(String type, String breed,
                                      Integer age, String personality,
                                      String specialNeeds) {

        if (apiKey == null || apiKey.isBlank()) {
            return "Le service de generation IA est indisponible (cle API manquante).";
        }

        String prompt = buildPrompt(type, breed, age, personality, specialNeeds);

        try {
            String jsonBody = buildGroqRequest(prompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            System.out.println("Status: " + response.statusCode());

            if (response.statusCode() != 200) {
                return "Erreur API: " + response.body();
            }

            String description = extractTextFromGroqResponse(response.body());
            return description != null ? description.trim() : "Description non générée";

        } catch (Exception e) {
            e.printStackTrace();
            return "Erreur: " + e.getMessage();
        }
    }

    private String buildGroqRequest(String prompt) {
        return """
        {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "user",
                    "content": "%s"
                }
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        """.formatted(escapeJson(prompt));
    }

    private String extractTextFromGroqResponse(String response) {
        String search = "\"content\":\"";
        int start = response.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = response.indexOf("\"", start);
        if (end == -1) return null;
        return response.substring(start, end)
                .replace("\\n", "\n")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String buildPrompt(String type, String breed, Integer age,
                               String personality, String specialNeeds) {
        String ageText = age != null ? age + " ans" : "âge non spécifié";
        String specialNeedsText = (specialNeeds != null && !specialNeeds.isEmpty())
                ? "\n- Besoins particuliers : " + specialNeeds : "";

        return """
            Tu es un rédacteur spécialisé dans les annonces d'adoption d'animaux.
            Rédige une description chaleureuse, engageante et professionnelle pour 
            un animal proposé à l'adoption.
            
            INFORMATIONS :
            - Type d'animal : %s
            - Race : %s
            - Âge : %s
            - Caractère : %s%s
            
            CONSIGNES :
            - Ton : chaleureux, positif et encourageant
            - Longueur : 100-150 mots maximum
            - Termine par un appel à l'action
            - Utilise des emojis 🐾
            
            GÉNÈRE UNIQUEMENT LA DESCRIPTION.
            """.formatted(type, breed, ageText, personality, specialNeedsText);
    }
}