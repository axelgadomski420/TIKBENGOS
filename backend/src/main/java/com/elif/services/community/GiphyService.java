package com.elif.services.community;

import com.elif.dto.community.response.GifResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Service
public class GiphyService {

    private static final String GIPHY_SEARCH_URL = "https://api.giphy.com/v1/gifs/search";

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${giphy.api-key:}")
    private String apiKey;

    public GiphyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<GifResponse> search(String query, int limit) {
        String trimmedQuery = query == null ? "" : query.trim();
        if (trimmedQuery.isEmpty()) {
            return List.of();
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GIPHY_API_KEY is not configured");
        }

        int safeLimit = Math.max(1, Math.min(limit, 50));
        URI uri = UriComponentsBuilder.fromUriString(GIPHY_SEARCH_URL)
                .queryParam("api_key", apiKey)
                .queryParam("q", trimmedQuery)
                .queryParam("limit", safeLimit)
                .queryParam("offset", 0)
                .queryParam("rating", "g")
                .queryParam("lang", "en")
                .build()
                .encode()
                .toUri();

        ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
        return parseResults(response.getBody());
    }

    private List<GifResponse> parseResults(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return List.of();
            }

            List<GifResponse> gifs = new ArrayList<>();
            for (JsonNode node : data) {
                String id = node.path("id").asText("");
                String title = cleanTitle(node.path("title").asText("GIF"));
                JsonNode images = node.path("images");
                String gifUrl = firstAvailableUrl(images, "original", "url");
                String previewUrl = firstAvailableUrl(images, "fixed_width_small", "url");
                if (previewUrl.isBlank()) {
                    previewUrl = firstAvailableUrl(images, "fixed_width_small_still", "url");
                }

                if (!id.isBlank() && !gifUrl.isBlank()) {
                    gifs.add(new GifResponse(id, title, gifUrl, previewUrl.isBlank() ? gifUrl : previewUrl));
                }
            }

            return gifs;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to read GIF search results", ex);
        }
    }

    private String firstAvailableUrl(JsonNode images, String childName, String fieldName) {
        if (images == null) {
            return "";
        }

        return images.path(childName).path(fieldName).asText("");
    }

    private String cleanTitle(String title) {
        String trimmed = title == null ? "" : title.trim();
        return trimmed.isEmpty() ? "GIF" : trimmed;
    }
}