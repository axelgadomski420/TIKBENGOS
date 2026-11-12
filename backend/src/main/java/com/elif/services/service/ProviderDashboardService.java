package com.elif.services.service;

import com.elif.dto.service.ProviderDashboardDTO;
import com.elif.dto.service.ProviderDashboardDTO.PriorityItem;
import com.elif.entities.service.Service;
import com.elif.entities.service.ServiceBooking;
import com.elif.repositories.service.ServiceBookingRepository;
import com.elif.repositories.service.ServiceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service qui génère un dashboard IA intelligent pour un provider.
 * Collecte les données brutes → construit un prompt → appelle Groq → parse JSON.
 */
@org.springframework.stereotype.Service
public class ProviderDashboardService {

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String model;

    private final ServiceBookingRepository bookingRepository;
    private final ServiceRepository serviceRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public ProviderDashboardService(ServiceBookingRepository bookingRepository,
                                    ServiceRepository serviceRepository) {
        this.bookingRepository = bookingRepository;
        this.serviceRepository = serviceRepository;
    }

    // ── Point d'entrée principal ──────────────────────────────────────────────

    public ProviderDashboardDTO generate(Long providerId) {
        // 1. Collecter les données
        List<ServiceBooking> allBookings = bookingRepository.findByServiceProviderId(providerId);
        List<ServiceBooking> todayBookings = bookingRepository.findTodayBookingsByProviderId(providerId, LocalDate.now());
        List<Service> services = serviceRepository.findAll().stream()
                .filter(s -> s.getProvider() != null && s.getProvider().getId().equals(providerId))
                .collect(Collectors.toList());

        // 2. Calcul des métriques
        DashboardMetrics metrics = computeMetrics(allBookings, todayBookings, services);

        // 3. Appel IA ou fallback
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return fallbackDashboard(metrics, todayBookings, services);
        }

        try {
            String prompt = buildPrompt(metrics, todayBookings, services);
            String content = callGroq(prompt);
            return parseGroqResponse(content, todayBookings);
        } catch (Exception e) {
            System.err.println("[Dashboard IA] Erreur Groq : " + e.getMessage());
            return fallbackDashboard(metrics, todayBookings, services);
        }
    }

    // ── Calcul des métriques brutes ───────────────────────────────────────────

    private DashboardMetrics computeMetrics(List<ServiceBooking> all,
                                             List<ServiceBooking> today,
                                             List<Service> services) {
        long total = all.size();
        long accepted = all.stream().filter(b -> "ACCEPTED".equalsIgnoreCase(b.getStatus())).count();
        long rejected = all.stream().filter(b -> "REJECTED".equalsIgnoreCase(b.getStatus())).count();
        long pending  = all.stream().filter(b -> "PENDING".equalsIgnoreCase(b.getStatus())).count();

        double acceptRate = total > 0 ? (double) accepted / total * 100 : 0.0;
        double rejectRate = total > 0 ? (double) rejected / total * 100 : 0.0;

        // Clients uniques
        long uniqueClients = all.stream()
                .filter(b -> b.getUser() != null)
                .map(b -> b.getUser().getId())
                .distinct().count();

        // Service le plus demandé
        Map<String, Long> serviceFreq = all.stream()
                .filter(b -> b.getService() != null)
                .collect(Collectors.groupingBy(b -> b.getService().getName(), Collectors.counting()));
        String topService = serviceFreq.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Jour de la semaine le plus actif
        Map<String, Long> dayFreq = all.stream()
                .filter(b -> b.getBookingDate() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getBookingDate().getDayOfWeek().toString(),
                        Collectors.counting()
                ));
        String peakDay = dayFreq.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Revenue total (ACCEPTED uniquement)
        double revenue = all.stream()
                .filter(b -> "ACCEPTED".equalsIgnoreCase(b.getStatus()))
                .mapToDouble(ServiceBooking::getTotalPrice)
                .sum();

        return new DashboardMetrics(total, accepted, rejected, pending,
                acceptRate, rejectRate, uniqueClients,
                topService, peakDay, revenue,
                today.size(), services.size());
    }

    // ── Construction du prompt Groq ───────────────────────────────────────────

    private String buildPrompt(DashboardMetrics m,
                                List<ServiceBooking> todayBookings,
                                List<Service> services) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a business assistant expert in pet care services.\n");
        sb.append("Analyze the following provider data and generate ONLY a valid JSON object.\n\n");

        // Données
        sb.append("=== PROVIDER DATA ===\n");
        sb.append("- Active services: ").append(m.totalServices).append("\n");
        sb.append("- Total bookings: ").append(m.totalBookings).append("\n");
        sb.append("- Today's bookings: ").append(m.todayCount).append("\n");
        sb.append("- Unique clients: ").append(m.uniqueClients).append("\n");
        sb.append("- Pending bookings: ").append(m.pending).append("\n");
        sb.append("- Acceptance rate: ").append(String.format("%.1f", m.acceptRate)).append("%\n");
        sb.append("- Rejection rate: ").append(String.format("%.1f", m.rejectRate)).append("%\n");
        sb.append("- Most requested service: ").append(m.topService).append("\n");
        sb.append("- Most active day: ").append(m.peakDay).append("\n");
        sb.append("- Total confirmed revenue: ").append(String.format("%.2f", m.revenue)).append(" TND\n\n");

        // Réservations du jour
        sb.append("=== TODAY'S BOOKINGS ===\n");
        if (todayBookings.isEmpty()) {
            sb.append("No bookings today.\n");
        } else {
            for (ServiceBooking b : todayBookings) {
                String svcName = b.getService() != null ? b.getService().getName() : "?";
                String clientName = b.getPetName() != null ? b.getPetName() : "?";
                sb.append("- Booking #").append(b.getId())
                  .append(" | Service: ").append(svcName)
                  .append(" | Pet: ").append(clientName)
                  .append(" | Status: ").append(b.getStatus())
                  .append(" | Price: ").append(b.getTotalPrice()).append(" TND\n");
            }
        }

        // Services disponibles
        sb.append("\n=== AVAILABLE SERVICES ===\n");
        for (Service s : services) {
            String cat = s.getCategory() != null ? s.getCategory().getName() : "General";
            sb.append("- ").append(s.getName())
              .append(" (").append(cat).append(")")
              .append(" | Price: ").append(s.getPrice()).append(" TND")
              .append(" | Rating: ").append(s.getRating()).append("/5\n");
        }

        sb.append("\n=== EXPECTED JSON FORMAT ===\n");
        sb.append("{\n");
        sb.append("  \"summary\": \"Short and useful summary of the day in 2-3 sentences. Address the provider directly.\",\n");
        sb.append("  \"priorities\": [\n");
        sb.append("    { \"bookingId\": 1, \"description\": \"...\", \"level\": \"URGENT\", \"reason\": \"...\" }\n");
        sb.append("  ],\n");
        sb.append("  \"insights\": [\n");
        sb.append("    \"Service X is the most requested with Y bookings\",\n");
        sb.append("    \"...\"\n");
        sb.append("  ],\n");
        sb.append("  \"recommendations\": [\n");
        sb.append("    \"Actionable suggestion 1\",\n");
        sb.append("    \"...\"\n");
        sb.append("  ]\n");
        sb.append("}\n\n");

        sb.append("RULES:\n");
        sb.append("- level must be exactly URGENT, NORMAL or FAIBLE\n");
        sb.append("- 3 to 5 insights maximum\n");
        sb.append("- 3 to 5 recommendations maximum\n");
        sb.append("- Reply ONLY with valid JSON, no text before or after\n");
        sb.append("- Language: English\n");

        return sb.toString();
    }

    // ── Appel HTTP vers Groq ──────────────────────────────────────────────────

    private String callGroq(String prompt) throws Exception {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(message));
        body.put("temperature", 0.4);
        body.put("max_tokens", 1500);

        String requestBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(groqApiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(60))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    // ── Parsing de la réponse JSON ────────────────────────────────────────────

    private ProviderDashboardDTO parseGroqResponse(String content, List<ServiceBooking> todayBookings) {
        try {
            String cleaned = content.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("```(json)?", "").trim();
            }

            JsonNode root = objectMapper.readTree(cleaned);

            String summary = root.path("summary").asText("Analyse non disponible.");

            List<PriorityItem> priorities = new ArrayList<>();
            JsonNode pNodes = root.path("priorities");
            if (pNodes.isArray()) {
                for (JsonNode p : pNodes) {
                    priorities.add(PriorityItem.builder()
                            .bookingId(p.path("bookingId").asLong())
                            .description(p.path("description").asText(""))
                            .level(p.path("level").asText("NORMAL"))
                            .reason(p.path("reason").asText(""))
                            .build());
                }
            }

            List<String> insights = new ArrayList<>();
            JsonNode iNodes = root.path("insights");
            if (iNodes.isArray()) {
                for (JsonNode i : iNodes) insights.add(i.asText());
            }

            List<String> recommendations = new ArrayList<>();
            JsonNode rNodes = root.path("recommendations");
            if (rNodes.isArray()) {
                for (JsonNode r : rNodes) recommendations.add(r.asText());
            }

            return ProviderDashboardDTO.builder()
                    .summary(summary)
                    .priorities(priorities)
                    .insights(insights)
                    .recommendations(recommendations)
                    .build();

        } catch (Exception e) {
            System.err.println("[Dashboard IA] Erreur parsing : " + e.getMessage());
            return buildErrorDashboard();
        }
    }

    // ── Fallback sans clé API ─────────────────────────────────────────────────

    private ProviderDashboardDTO fallbackDashboard(DashboardMetrics m,
                                                    List<ServiceBooking> today,
                                                    List<Service> services) {
        String summary = String.format(
            "You have %d booking(s) today. Overall acceptance rate: %.1f%%. " +
            "Most popular service: %s.",
            m.todayCount, m.acceptRate, m.topService
        );

        List<PriorityItem> priorities = new ArrayList<>();
        for (ServiceBooking b : today) {
            String level = "PENDING".equalsIgnoreCase(b.getStatus()) ? "URGENT" : "NORMAL";
            String svc = b.getService() != null ? b.getService().getName() : "Service";
            priorities.add(PriorityItem.builder()
                    .bookingId(b.getId())
                    .description(svc + " — " + b.getPetName())
                    .level(level)
                    .reason("PENDING".equalsIgnoreCase(b.getStatus()) ? "Awaiting processing" : "Already handled")
                    .build());
        }

        List<String> insights = List.of(
            "Most requested service: " + m.topService,
            "Most active day: " + m.peakDay,
            "Unique clients: " + m.uniqueClients,
            "Confirmed revenue: " + String.format("%.2f", m.revenue) + " TND"
        );

        List<String> recommendations = List.of(
            m.pending > 0 ? "Process the " + m.pending + " pending booking(s) as soon as possible." : "No pending bookings — great job!",
            m.rejectRate > 30 ? "Your rejection rate is high (" + String.format("%.1f", m.rejectRate) + "%). Review your availability." : "Your rejection rate is healthy — keep it up.",
            "Open additional slots on " + m.peakDay + " (your busiest day).",
            "Highlight the '" + m.topService + "' service on your profile to attract more clients."
        );

        return ProviderDashboardDTO.builder()
                .summary(summary)
                .priorities(priorities)
                .insights(insights)
                .recommendations(recommendations)
                .build();
    }

    private ProviderDashboardDTO buildErrorDashboard() {
        return ProviderDashboardDTO.builder()
                .summary("Unable to generate AI analysis. Please try again.")
                .priorities(List.of())
                .insights(List.of("Check your connection to the Groq API."))
                .recommendations(List.of("Make sure GROQ_API_KEY is set in your .env file."))
                .build();
    }

    // ── Inner class métriques ─────────────────────────────────────────────────

    private static class DashboardMetrics {
        final long totalBookings, accepted, rejected, pending;
        final double acceptRate, rejectRate, revenue;
        final long uniqueClients;
        final String topService, peakDay;
        final int todayCount, totalServices;

        DashboardMetrics(long total, long accepted, long rejected, long pending,
                         double acceptRate, double rejectRate, long uniqueClients,
                         String topService, String peakDay, double revenue,
                         int todayCount, int totalServices) {
            this.totalBookings = total;
            this.accepted = accepted;
            this.rejected = rejected;
            this.pending = pending;
            this.acceptRate = acceptRate;
            this.rejectRate = rejectRate;
            this.uniqueClients = uniqueClients;
            this.topService = topService;
            this.peakDay = peakDay;
            this.revenue = revenue;
            this.todayCount = todayCount;
            this.totalServices = totalServices;
        }
    }
}
