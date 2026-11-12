package com.elif.services.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class ChatbotService {

    private final String apiKey;
    private final HttpClient httpClient;

    public ChatbotService(@Value("${groq.api-key:${ai.groq.api-key:${app.ai.groq.api-key:}}}") String apiKey) {
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newHttpClient();
    }

    // ============================================================
    // MÉTHODE PRINCIPALE — appelée par le controller
    // ============================================================

    public String chat(String systemPrompt, List<Map<String, String>> history, String userMessage) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                return "Chat service is temporarily unavailable (missing AI API key).";
            }

            String jsonBody = buildGroqRequest(systemPrompt, history, userMessage);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString());

            System.out.println("Chatbot Groq status: " + response.statusCode());

            if (response.statusCode() != 200) {
                System.err.println("Groq error: " + response.body());
                return "Sorry, I'm having trouble connecting. Please try again.";
            }

            String text = extractTextFromGroqResponse(response.body());
            return text != null ? text.trim() : "I couldn't generate a response.";

        } catch (Exception e) {
            e.printStackTrace();
            return "An error occurred: " + e.getMessage();
        }
    }

    // ============================================================
    // CONSTRUCTION DU BODY JSON GROQ
    // ============================================================

    private String buildGroqRequest(String systemPrompt,
                                    List<Map<String, String>> history,
                                    String userMessage) {

        StringBuilder messagesJson = new StringBuilder("[");

        // Message système
        messagesJson.append("""
            {"role":"system","content":"%s"}
            """.formatted(escapeJson(systemPrompt)));

        // Historique de conversation
        for (Map<String, String> msg : history) {
            String role    = msg.getOrDefault("role", "user");
            String content = msg.getOrDefault("content", "");
            messagesJson.append("""
                ,{"role":"%s","content":"%s"}
                """.formatted(escapeJson(role), escapeJson(content)));
        }

        // Message utilisateur actuel
        messagesJson.append("""
            ,{"role":"user","content":"%s"}
            """.formatted(escapeJson(userMessage)));

        messagesJson.append("]");

        return """
            {
                "model": "llama-3.3-70b-versatile",
                "messages": %s,
                "max_tokens": 800,
                "temperature": 0.7
            }
            """.formatted(messagesJson.toString());
    }

    // ============================================================
    // EXTRACTION DE LA RÉPONSE
    // ============================================================

    private String extractTextFromGroqResponse(String response) {
        String search = "\"content\":\"";
        int start = response.indexOf(search);
        if (start == -1) return null;
        start += search.length();

        // Extraire jusqu'au prochain " non échappé
        StringBuilder result = new StringBuilder();
        int i = start;
        while (i < response.length()) {
            char c = response.charAt(i);
            if (c == '\\' && i + 1 < response.length()) {
                char next = response.charAt(i + 1);
                switch (next) {
                    case 'n'  -> result.append('\n');
                    case 't'  -> result.append('\t');
                    case '"'  -> result.append('"');
                    case '\\' -> result.append('\\');
                    default   -> result.append(next);
                }
                i += 2;
            } else if (c == '"') {
                break;
            } else {
                result.append(c);
                i++;
            }
        }
        return result.toString();
    }

    // ============================================================
    // ESCAPE JSON
    // ============================================================

    private String escapeJson(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}