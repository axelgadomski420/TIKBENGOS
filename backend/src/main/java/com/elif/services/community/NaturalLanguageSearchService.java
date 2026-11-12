package com.elif.services.community;

import com.elif.dto.community.response.NaturalLanguageSearchResponse;
import com.elif.dto.community.response.PostResponse;
import com.elif.entities.community.Flair;
import com.elif.repositories.community.CommunityRepository;
import com.elif.repositories.community.FlairRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NaturalLanguageSearchService {

    private final PostService postService;
    private final CommunityRepository communityRepository;
    private final FlairRepository flairRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.ai.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public NaturalLanguageSearchResponse ask(String query, Long viewerId) {
        String normalizedQuery = normalizeQuery(query);
        if (normalizedQuery == null) {
            throw new IllegalArgumentException("Query is required");
        }

        List<PostResponse> posts = postService.search(normalizedQuery, viewerId).stream()
                .limit(8)
                .toList();
        List<CommunityContext> communities = findCommunityContext(normalizedQuery, posts);
        List<String> flairs = findFlairContext(normalizedQuery, posts);

        if (posts.isEmpty()) {
            return NaturalLanguageSearchResponse.builder()
                    .query(query)
                    .normalizedQuery(normalizedQuery)
                    .answer("I could not find matching community posts yet. Try a shorter prompt with key terms like pet type, issue, or region.")
                    .model("keyword-search")
                    .aiEnhanced(false)
                    .followUps(List.of(
                            "Adoption success stories for small dogs",
                            "EU pet transit checklist",
                            "How to prepare documents for pet travel"))
                    .posts(List.of())
                    .build();
        }

        if (groqApiKey == null || groqApiKey.isBlank()) {
            return NaturalLanguageSearchResponse.builder()
                    .query(query)
                    .normalizedQuery(normalizedQuery)
                    .answer(buildFallbackAnswer(posts))
                    .model("keyword-search")
                    .aiEnhanced(false)
                    .followUps(defaultFollowUps(normalizedQuery))
                    .posts(posts)
                    .build();
        }

        try {
            AiAnswer aiAnswer = callGroq(normalizedQuery, posts, communities, flairs);
            return NaturalLanguageSearchResponse.builder()
                    .query(query)
                    .normalizedQuery(normalizedQuery)
                    .answer(aiAnswer.answer())
                    .model(aiAnswer.model())
                    .aiEnhanced(true)
                    .followUps(aiAnswer.followUps().isEmpty() ? defaultFollowUps(normalizedQuery) : aiAnswer.followUps())
                    .posts(posts)
                    .build();
        } catch (IllegalStateException ex) {
            return NaturalLanguageSearchResponse.builder()
                    .query(query)
                    .normalizedQuery(normalizedQuery)
                    .answer(buildFallbackAnswer(posts))
                    .model("keyword-search")
                    .aiEnhanced(false)
                    .followUps(defaultFollowUps(normalizedQuery))
                    .posts(posts)
                    .build();
        }
    }

    private AiAnswer callGroq(String query, List<PostResponse> posts, List<CommunityContext> communities, List<String> flairs) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", (groqModel == null || groqModel.isBlank()) ? "llama-3.1-8b-instant" : groqModel.trim());
        body.put("temperature", 0.2);
        body.put("max_tokens", 700);
        body.set("response_format", objectMapper.createObjectNode().put("type", "json_object"));

        String prompt = buildPrompt(query, posts, communities, flairs);
        ObjectNode message = objectMapper.createObjectNode();
        message.put("role", "user");
        message.put("content", prompt);
        body.set("messages", objectMapper.createArrayNode().add(message));

        HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new IllegalStateException(readErrorMessage(response.body()));
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("").trim();
            String model = root.path("model").asText((groqModel == null || groqModel.isBlank()) ? "groq" : groqModel);
            if (content.isBlank()) {
                throw new IllegalStateException("AI answer is currently unavailable");
            }

            JsonNode parsed = parseJsonCandidate(content);
            if (parsed == null || !parsed.isObject()) {
                return new AiAnswer(cleanLine(content), defaultFollowUps(query), model);
            }
            String answer = cleanLine(parsed.path("answer").asText(""));
            if (answer.isBlank()) {
                throw new IllegalStateException("AI answer is currently unavailable");
            }

            List<String> followUps = new ArrayList<>();
            ArrayNode followUpNode = parsed.path("followUps").isArray() ? (ArrayNode) parsed.path("followUps") : null;
            if (followUpNode != null) {
                for (JsonNode node : followUpNode) {
                    String value = cleanLine(node.asText(""));
                    if (!value.isBlank()) {
                        followUps.add(value);
                    }
                    if (followUps.size() >= 3) {
                        break;
                    }
                }
            }

            return new AiAnswer(answer, followUps, model);
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("AI answer is currently unavailable", ex);
        }
    }

    private String buildPrompt(String query, List<PostResponse> posts, List<CommunityContext> communities, List<String> flairs) {
        StringBuilder context = new StringBuilder();
        context.append("You are helping users search a pet community knowledge base.\n")
                .append("User query: ").append(query).append("\n\n")
                .append("Use only the provided context (posts, communities, flairs). Do not invent facts.\n")
                .append("Return ONLY JSON with this schema:\n")
                .append("{\"answer\":\"\", \"followUps\":[\"\", \"\", \"\"]}\n")
                .append("Rules:\n")
                .append("- answer: 2-4 short sentences, practical, friendly.\n")
                .append("- Mention what users can find in the matched threads.\n")
                .append("- Mention relevant communities and flairs when helpful.\n")
                .append("- If evidence is limited, say so clearly.\n")
                .append("- followUps: 2-3 natural-language questions users can click next.\n\n")
                .append("Matched posts:\n");

        for (int i = 0; i < posts.size(); i++) {
            PostResponse post = posts.get(i);
            context.append(i + 1)
                    .append(". title=").append(cleanLine(post.getTitle()))
                    .append(" | community=").append(cleanLine(post.getCommunitySlug()))
                    .append(" | type=").append(post.getType() == null ? "DISCUSSION" : post.getType().name())
                    .append(" | score=").append(post.getVoteScore())
                    .append(" | comments=").append(post.getCommentCount())
                    .append(" | content=").append(cleanLine(post.getContent()))
                    .append("\n");
        }

        context.append("\nMatched communities:\n");
        for (int i = 0; i < communities.size(); i++) {
            CommunityContext community = communities.get(i);
            context.append(i + 1)
                    .append(". name=").append(cleanLine(community.name()))
                    .append(" | slug=").append(cleanLine(community.slug()))
                    .append(" | members=").append(community.memberCount())
                    .append(" | description=").append(cleanLine(community.description()))
                    .append("\n");
        }

        context.append("\nMatched flairs:\n");
        for (int i = 0; i < flairs.size(); i++) {
            context.append(i + 1).append(". ").append(cleanLine(flairs.get(i))).append("\n");
        }

        return context.toString();
    }

    private String normalizeQuery(String query) {
        if (query == null) {
            return null;
        }
        String normalized = query.trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }

    private String buildFallbackAnswer(List<PostResponse> posts) {
        if (posts.isEmpty()) {
            return "No relevant threads were found yet.";
        }

        StringBuilder answer = new StringBuilder("I found relevant community threads you can open right away");
        if (posts.size() >= 1) {
            answer.append(": \"").append(cleanLine(posts.get(0).getTitle())).append("\"");
        }
        if (posts.size() >= 2) {
            answer.append(", \"").append(cleanLine(posts.get(1).getTitle())).append("\"");
        }
        if (posts.size() >= 3) {
            answer.append(", and \"").append(cleanLine(posts.get(2).getTitle())).append("\"");
        }
        answer.append(".");
        return answer.toString();
    }

    private List<String> defaultFollowUps(String query) {
        return List.of(
                "Show practical checklist posts for " + query,
                "Find the most upvoted discussions about " + query,
                "Show beginner-friendly advice related to " + query);
    }

    private String cleanLine(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    private JsonNode parseJsonCandidate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String source = raw
                .replaceFirst("(?is)^```json\\s*", "")
                .replaceFirst("(?is)^```\\s*", "")
                .replaceFirst("(?is)\\s*```$", "")
                .trim();

        try {
            if (source.startsWith("{")) {
                return objectMapper.readTree(source);
            }
        } catch (Exception ignored) {
        }

        int start = source.indexOf('{');
        if (start < 0) {
            return null;
        }

        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        for (int i = start; i < source.length(); i++) {
            char c = source.charAt(i);

            if (escape) {
                escape = false;
                continue;
            }
            if (c == '\\' && inString) {
                escape = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    try {
                        return objectMapper.readTree(source.substring(start, i + 1));
                    } catch (Exception ignored) {
                        return null;
                    }
                }
            }
        }

        return null;
    }

    private List<CommunityContext> findCommunityContext(String query, List<PostResponse> posts) {
        List<CommunityContext> fromSearch = communityRepository
                .findTop8ByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrderByMemberCountDesc(query, query)
                .stream()
                .map(community -> new CommunityContext(
                        community.getName(),
                        community.getSlug(),
                        community.getDescription(),
                        community.getMemberCount()))
                .toList();

        if (!fromSearch.isEmpty()) {
            return fromSearch;
        }

        LinkedHashSet<String> communitySlugs = new LinkedHashSet<>();
        for (PostResponse post : posts) {
            String slug = cleanLine(post.getCommunitySlug());
            if (!slug.isBlank()) {
                communitySlugs.add(slug);
            }
        }

        return communitySlugs.stream()
                .limit(8)
                .map(slug -> new CommunityContext(slug, slug, "", 0))
                .toList();
    }

    private List<String> findFlairContext(String query, List<PostResponse> posts) {
        Set<String> flairNames = new LinkedHashSet<>();
        for (PostResponse post : posts) {
            String flair = cleanLine(post.getFlairName());
            if (!flair.isBlank()) {
                flairNames.add(flair);
            }
        }

        List<String> fromRepo = flairRepository.findTop12ByNameContainingIgnoreCase(query).stream()
                .map(Flair::getName)
                .map(this::cleanLine)
                .filter(value -> !value.isBlank())
                .toList();
        flairNames.addAll(fromRepo);

        return flairNames.stream().limit(12).collect(Collectors.toList());
    }

    private String readErrorMessage(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText("").trim();
            if (!message.isBlank()) {
                return "AI answer request failed: " + message;
            }
        } catch (Exception ignored) {
        }
        return "AI answer request failed";
    }

    private record AiAnswer(String answer, List<String> followUps, String model) {
    }

    private record CommunityContext(String name, String slug, String description, int memberCount) {
    }
}
