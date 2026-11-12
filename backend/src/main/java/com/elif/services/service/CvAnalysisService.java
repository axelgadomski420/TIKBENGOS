package com.elif.services.service;

import com.elif.dto.service.MissionMatchDTO;
import com.elif.entities.service.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service d'analyse intelligente des CV.
 * Responsabilités :
 *  - Extraire le texte d'un fichier PDF via PDFBox
 *  - Appeler Groq (LLM gratuit, compatible API OpenAI) pour générer :
 *      · un résumé du profil en 1 paragraphe
 *      · un score de cohérence (0.0 → 1.0)
 *      · une liste de missions matchées (score 0 → 100)
 *  - Filtrer les missions avec score ≤ 50 et trier par score décroissant
 */
@org.springframework.stereotype.Service
public class CvAnalysisService {

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    // ── Résultat d'une analyse CV ──────────────────────────────────────────────
    public static class CvAnalysisResult {
        public String summary;
        public double coherenceScore;
        public List<MissionMatchDTO> missions;

        public CvAnalysisResult(String summary, double coherenceScore, List<MissionMatchDTO> missions) {
            this.summary = summary;
            this.coherenceScore = coherenceScore;
            this.missions = missions;
        }
    }

    // ── Extraction du texte PDF depuis un MultipartFile ──────────────────────
    public String extractTextFromPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            System.err.println("[CV Analysis] Erreur : Fichier PDF vide ou nul.");
            return "";
        }
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            return extractText(doc);
        } catch (IOException e) {
            System.err.println("[CV Analysis] Erreur lors de l'extraction PDF (stream) : " + e.getMessage());
            return "";
        }
    }

    // ── Extraction du texte PDF depuis un fichier sur disque (plus fiable) ───
    public String extractTextFromPath(Path filePath) {
        File file = filePath.toFile();
        if (!file.exists() || file.length() == 0) {
            System.err.println("[CV Analysis] Fichier introuvable ou vide : " + filePath);
            return "";
        }
        try (PDDocument doc = Loader.loadPDF(file)) {
            return extractText(doc);
        } catch (IOException e) {
            System.err.println("[CV Analysis] Erreur lors de l'extraction PDF (disque) : " + e.getMessage());
            return "";
        }
    }

    // ── Helper commun d'extraction ────────────────────────────────────────────
    private String extractText(PDDocument doc) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        String text = stripper.getText(doc).trim();
        System.out.println("[CV Analysis] Texte extrait : " + text.length() + " caractères.");
        if (text.isEmpty()) {
            System.err.println("[CV Analysis] Avertissement : texte vide — PDF scanné (image) sans couche OCR ?");
        }
        // Limiter à 4000 caractères pour ne pas dépasser les tokens LLM
        return text.length() > 4000 ? text.substring(0, 4000) : text;
    }

    // ── Analyse principale ─────────────────────────────────────────────────────
    public CvAnalysisResult analyze(String cvText, List<Service> services) {
        if (cvText == null || cvText.isBlank()) {
            // PDF scanné sans texte — fallback keyword (score 0 si texte vide)
            return new CvAnalysisResult(
                "Le PDF soumis ne contient pas de texte extractible (PDF scanné / image). " +
                "Veuillez soumettre un PDF avec une couche de texte (non scanné).",
                0.0, List.of());
        }
        if (groqApiKey == null || groqApiKey.isBlank()) {
            // Pas de clé API : fallback par mots-clés simples
            return fallbackAnalysis(cvText, services);
        }

        try {
            String prompt = buildPrompt(cvText, services);
            String responseJson = callGroq(prompt);
            return parseGroqResponse(responseJson, services);
        } catch (Exception e) {
            System.err.println("[CV Analysis] Erreur lors de l'appel LLM : " + e.getMessage());
            // En cas d'erreur réseau ou parsing, on utilise le fallback
            return fallbackAnalysis(cvText, services);
        }
    }

    // ── Construction du prompt ─────────────────────────────────────────────────
    private String buildPrompt(String cvText, List<Service> services) {
        StringBuilder missionsJson = new StringBuilder("[");
        for (int i = 0; i < services.size(); i++) {
            Service s = services.get(i);
            String cat = s.getCategory() != null ? s.getCategory().getName() : "Général";
            missionsJson.append("{")
                    .append("\"serviceId\":").append(s.getId()).append(",")
                    .append("\"serviceName\":\"").append(escape(s.getName())).append("\",")
                    .append("\"category\":\"").append(escape(cat)).append("\",")
                    .append("\"description\":\"").append(escape(s.getDescription())).append("\"")
                    .append("}");
            if (i < services.size() - 1) missionsJson.append(",");
        }
        missionsJson.append("]");

        return "Tu es un expert RH spécialisé dans les services pour animaux de compagnie.\n" +
                "Analyse ce CV et retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après.\n\n" +
                "Format JSON attendu :\n" +
                "{\n" +
                "  \"summary\": \"Résumé du profil en 1 paragraphe\",\n" +
                "  \"coherenceScore\": 0.85,\n" +
                "  \"matches\": [\n" +
                "    { \"serviceId\": 1, \"serviceName\": \"...\", \"category\": \"...\", \"score\": 80 }\n" +
                "  ]\n" +
                "}\n\n" +
                "Règles :\n" +
                "- coherenceScore entre 0.0 et 1.0 (cohérence entre compétences et expérience)\n" +
                "- score de matching entre 0 et 100 pour chaque mission\n" +
                "- N'inclure dans matches QUE les missions avec score > 50\n" +
                "- Trier les matches par score décroissant\n\n" +
                "Missions disponibles :\n" + missionsJson + "\n\n" +
                "CV à analyser :\n" + cvText;
    }

    // ── Appel HTTP vers Groq ──────────────────────────────────────────────────
    private String callGroq(String prompt) throws IOException, InterruptedException {
        String requestBody = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("model", model);
            put("messages", List.of(new java.util.HashMap<>() {{
                put("role", "user");
                put("content", prompt);
            }}));
            put("temperature", 0.3);
            put("max_tokens", 1024);
        }});

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(groqApiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error: " + response.statusCode() + " — " + response.body());
        }

        // Extraire le contenu de la réponse OpenAI-compatible
        JsonNode root = objectMapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    // ── Parsing de la réponse JSON du LLM ─────────────────────────────────────
    private CvAnalysisResult parseGroqResponse(String content, List<Service> services) {
        try {
            // Le LLM peut parfois ajouter des backticks markdown, on les nettoie
            String cleaned = content.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("```(json)?", "").trim();
            }

            JsonNode root = objectMapper.readTree(cleaned);
            String summary = root.path("summary").asText("Résumé non disponible.");
            double coherenceScore = root.path("coherenceScore").asDouble(0.0);
            // Borner entre 0 et 1
            coherenceScore = Math.max(0.0, Math.min(1.0, coherenceScore));

            List<MissionMatchDTO> missions = new ArrayList<>();
            JsonNode matches = root.path("matches");
            if (matches.isArray()) {
                for (JsonNode match : matches) {
                    int score = match.path("score").asInt(0);
                    if (score > 50) {
                        missions.add(MissionMatchDTO.builder()
                                .serviceId(match.path("serviceId").asLong())
                                .serviceName(match.path("serviceName").asText(""))
                                .category(match.path("category").asText(""))
                                .matchScore(score)
                                .build());
                    }
                }
            }

            // Trier par score décroissant (au cas où le LLM ne l'a pas fait)
            missions.sort(Comparator.comparingInt(MissionMatchDTO::getMatchScore).reversed());

            return new CvAnalysisResult(summary, coherenceScore, missions);
        } catch (Exception e) {
            return new CvAnalysisResult("Erreur lors de l'analyse du CV.", 0.0, List.of());
        }
    }

    // ── Fallback sans LLM (matching par mots-clés simples) ───────────────────
    private CvAnalysisResult fallbackAnalysis(String cvText, List<Service> services) {
        String textLower = cvText == null ? "" : cvText.toLowerCase();
        String summary = "Analyse automatique basée sur mots-clés (clé API non configurée).";

        List<MissionMatchDTO> missions = new ArrayList<>();
        for (Service s : services) {
            int score = computeKeywordScore(textLower, s);
            if (score > 50) {
                String cat = s.getCategory() != null ? s.getCategory().getName() : "Général";
                missions.add(MissionMatchDTO.builder()
                        .serviceId(s.getId())
                        .serviceName(s.getName())
                        .category(cat)
                        .matchScore(score)
                        .build());
            }
        }
        missions.sort(Comparator.comparingInt(MissionMatchDTO::getMatchScore).reversed());

        // Score de cohérence basique : ratio de champs non vides
        double coherence = textLower.isBlank() ? 0.0 : 0.5;

        return new CvAnalysisResult(summary, coherence, missions);
    }

    /** Score 0-100 basé sur combien de mots du service apparaissent dans le CV */
    private int computeKeywordScore(String cvText, Service s) {
        if (s.getName() == null) return 0;
        String[] keywords = (s.getName() + " " +
                (s.getDescription() != null ? s.getDescription() : ""))
                .toLowerCase().split("\\s+");
        long hits = 0;
        for (String kw : keywords) {
            if (kw.length() > 3 && cvText.contains(kw)) hits++;
        }
        if (keywords.length == 0) return 0;
        return (int) Math.min(100, (hits * 100) / Math.max(1, keywords.length));
    }

    // ── Utilitaire : échapper les guillemets JSON ─────────────────────────────
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
