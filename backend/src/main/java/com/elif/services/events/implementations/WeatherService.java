package com.elif.services.events.implementations;

import com.elif.dto.events.response.WeatherResponse;
import com.elif.entities.events.Event;
import com.elif.exceptions.events.EventExceptions;
import com.elif.repositories.events.EventRepository;
import com.elif.services.events.interfaces.IWeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherService implements IWeatherService {

    @Value("${weather.api.key}")
    private String apiKey;

    @Value("${weather.api.url:https://api.openweathermap.org/data/2.5}")
    private String apiUrl;

    private final EventRepository eventRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    // ─────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────

    @Override
    public WeatherResponse getWeatherForEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventExceptions.EventNotFoundException(eventId));

        String city = extractCity(event.getLocation());

        return getWeatherByCity(city, event.getStartDate());
    }

    @Override
    @Cacheable(value = "weather", key = "#city.toLowerCase() + '_' + #eventDate.toLocalDate()")
    public WeatherResponse getWeatherByCity(String city, LocalDateTime eventDate) {

        if (!hasValidApiKey()) {
            return buildMockWeather(city, eventDate);
        }

        try {
            return fetchForecast(city, eventDate);
        } catch (Exception e) {
            log.warn("⚠️ Weather API error for {}: {}", city, e.getMessage());
            return buildMockWeather(city, eventDate);
        }
    }

    // ─────────────────────────────────────────────
    // CORE LOGIC (FORECAST ONLY)
    // ─────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private WeatherResponse fetchForecast(String city, LocalDateTime eventDate) {

        String url = String.format(
                "%s/forecast?q=%s&appid=%s&units=metric&lang=en",
                apiUrl,
                city.replace(" ", "%20"),
                apiKey
        );

        Map<String, Object> response = restTemplate.getForObject(url, Map.class);

        if (response == null || response.get("list") == null) {
            throw new RestClientException("Invalid weather response");
        }

        List<Map<String, Object>> list = (List<Map<String, Object>>) response.get("list");

        // Find closest forecast
        Map<String, Object> best = findClosestForecast(list, eventDate);

        Map<String, Object> main = (Map<String, Object>) best.get("main");
        Map<String, Object> wind = (Map<String, Object>) best.get("wind");
        List<Map<String, Object>> weather = (List<Map<String, Object>>) best.get("weather");

        double temp = ((Number) main.get("temp")).doubleValue();
        int humidity = ((Number) main.get("humidity")).intValue();
        double windKmh = ((Number) wind.get("speed")).doubleValue() * 3.6;

        String description = (String) weather.get(0).get("description");
        String icon = (String) weather.get(0).get("icon");
        String condition = mapCondition((String) weather.get(0).get("main"));

        return WeatherResponse.builder()
                .temperature(round(temp))
                .description(description)
                .icon(icon)
                .humidity(humidity)
                .windSpeed(round(windKmh))
                .condition(condition)
                .recommendation(buildRecommendation(condition, windKmh, temp))
                .recommendationMsg(buildMessage(condition, windKmh, temp, eventDate))
                .eventDay(eventDate.toLocalDate().equals(LocalDateTime.now().toLocalDate()))
                .city(city)
                .build();
    }

    // ─────────────────────────────────────────────
    // FORECAST MATCHING
    // ─────────────────────────────────────────────

    private Map<String, Object> findClosestForecast(
            List<Map<String, Object>> list,
            LocalDateTime target
    ) {
        Map<String, Object> best = null;
        long minDiff = Long.MAX_VALUE;

        for (Map<String, Object> f : list) {
            String dtTxt = (String) f.get("dt_txt");
            if (dtTxt == null) continue;

            LocalDateTime time = LocalDateTime.parse(dtTxt.replace(" ", "T"));

            long diff = Math.abs(
                    java.time.Duration.between(target, time).toMinutes()
            );

            if (diff < minDiff) {
                minDiff = diff;
                best = f;
            }
        }

        return best != null ? best : list.get(0);
    }

    // ─────────────────────────────────────────────
    // BUSINESS LOGIC
    // ─────────────────────────────────────────────

    private String mapCondition(String main) {
        if (main == null) return "UNKNOWN";

        return switch (main.toUpperCase()) {
            case "CLEAR" -> "SUNNY";
            case "CLOUDS" -> "CLOUDY";
            case "RAIN", "DRIZZLE" -> "RAINY";
            case "THUNDERSTORM" -> "STORMY";
            case "SNOW" -> "SNOWY";
            default -> "CLOUDY";
        };
    }

    private String buildRecommendation(String condition, double wind, double temp) {
        return switch (condition) {
            case "RAINY", "STORMY", "SNOWY" -> "INDOOR";
            case "SUNNY", "CLOUDY" ->
                    (wind > 50 || temp < 5 || temp > 38) ? "INDOOR" : "OUTDOOR";
            default -> "OUTDOOR";
        };
    }

    private String buildMessage(String condition, double wind, double temp, LocalDateTime date) {
        String d = format(date);

        return switch (condition) {
            case "RAINY" -> "🌧️ Rain expected on " + d;
            case "STORMY" -> "⛈️ Thunderstorms expected on " + d;
            case "SNOWY" -> "❄️ Snow expected on " + d;
            case "SUNNY" -> temp > 35
                    ? "☀️ Extreme heat on " + d + " — consider indoor options with AC"
                    : "☀️ Sunny weather on " + d + " — perfect for outdoor events!";
            case "CLOUDY" -> wind > 50
                    ? "💨 Strong winds on " + d + " — prefer a sheltered location"
                    : "⛅ Cloudy skies on " + d + " — outdoor is possible";
            default -> "🌤️ Uncertain weather on " + d + " — check forecast before the event";
        };
    }

    // ─────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private String format(LocalDateTime d) {
        return d.format(DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH));
    }

    private boolean hasValidApiKey() {
        return apiKey != null && !apiKey.isBlank() && apiKey.length() > 10;
    }

    private String extractCity(String location) {
        if (location == null || location.isBlank()) return "Tunis";
        return location.split(",")[0].trim();
    }

    // ─────────────────────────────────────────────
    // CACHE CLEANUP
    // ─────────────────────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    @CacheEvict(value = "weather", allEntries = true)
    public void clearCache() {
        log.info("🧹 Weather cache cleared");
    }

    // ─────────────────────────────────────────────
    // MOCK DATA
    // ─────────────────────────────────────────────

    private WeatherResponse buildMockWeather(String city, LocalDateTime date) {
        String d = format(date);

        return WeatherResponse.builder()
                .temperature(22.0)
                .description("Demo weather data (configure weather.api.key)")
                .icon("01d")
                .humidity(60)
                .windSpeed(10.0)
                .condition("SUNNY")
                .recommendation("OUTDOOR")
                .recommendationMsg("☀️ Demo: Sunny weather expected on " + d)
                .eventDay(date.toLocalDate().equals(LocalDateTime.now().toLocalDate()))
                .city(city)
                .build();
    }
}