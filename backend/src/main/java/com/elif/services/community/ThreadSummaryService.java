package com.elif.services.community;

import com.elif.dto.community.response.CommentResponse;
import com.elif.dto.community.response.ThreadSummaryResponse;
import com.elif.entities.community.Post;
import com.elif.entities.user.User;
import com.elif.exceptions.community.PostNotFoundException;
import com.elif.repositories.community.PostRepository;
import com.elif.repositories.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ThreadSummaryService {

  private static final Set<String> ALLOWED_SUMMARY_ICONS = Set.of(
      "auto_awesome", "insights", "light_mode", "pets", "psychology", "track_changes", "visibility", "forum",
      "check_circle", "bolt", "schedule", "thumb_up", "priority_high", "emoji_objects", "school", "help",
      "question_answer", "campaign", "local_shipping", "flag", "error", "warning", "description", "gavel",
      "group", "task_alt", "label", "person");

  private static final Map<String, String> ICON_ALIASES = Map.ofEntries(
      Map.entry("help_center", "help"),
      Map.entry("warning_amber", "warning"),
      Map.entry("error_outline", "error"),
      Map.entry("groups", "group"),
      Map.entry("local_offer", "label"),
      Map.entry("urgent", "priority_high"),
      Map.entry("danger", "error"),
      Map.entry("discussion", "forum"),
      Map.entry("question", "help"));

  private static final Set<String> KEYWORD_STOP_WORDS = Set.of(
      "the", "and", "for", "with", "that", "this", "from", "have", "has", "had", "was", "were", "are", "but",
      "too", "our", "your", "their", "them", "then", "than", "into", "about", "when", "while", "where", "what",
      "which", "would", "could", "should", "need", "needs", "just", "very", "really", "also", "over", "under",
      "same", "still", "more", "most", "some", "such", "only", "here", "there", "they", "you", "we",
      "its", "it", "a", "an", "to", "of", "in", "on", "at", "as", "by", "is", "be", "or", "if", "do", "did");

  private static final boolean DEBUG_SUMMARY = true;

  private final PostRepository postRepository;
  private final UserRepository userRepository;
  private final CommentService commentService;
  private final ObjectMapper objectMapper;

  @Value("${app.ai.gemini.api-key:}")
  private String geminiApiKey;

  @Value("${app.ai.gemini.model:gemini-2.0-flash}")
  private String geminiModel;

  @Value("${app.ai.groq.api-key:}")
  private String groqApiKey;

  @Value("${app.ai.groq.model:llama-3.1-8b-instant}")
  private String groqModel;

  @Value("${app.ai.summary.max-comments:160}")
  private int maxComments;

  @Value("${app.ai.summary.max-input-chars:18000}")
  private int maxInputChars;

  @Value("${app.ai.summary.enabled:true}")
  private boolean summaryEnabled;

  private final HttpClient httpClient = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(8))
      .build();

  public ThreadSummaryResponse summarizePostThread(Long postId, Long viewerId) {
    if (postId == null) {
      throw new IllegalArgumentException("Post id is required");
    }

    if (!summaryEnabled) {
      throw new IllegalStateException("AI thread summaries are disabled");
    }
    if (groqApiKey == null || groqApiKey.isBlank()) {
      throw new IllegalStateException("Groq API key is not configured");
    }

    Post post = postRepository.findById(postId)
        .orElseThrow(() -> new PostNotFoundException("Post not found"));

    if (post.isDeleted()) {
      throw new PostNotFoundException("Post not found");
    }

    List<CommentResponse> commentTree = commentService.getCommentTree(postId, viewerId);

    BuildResult buildResult = buildThreadInput(post, commentTree);
    SummaryResult summaryResult = callGemini(buildResult.prompt);
    String normalizedSummary = normalizeSummaryJson(summaryResult.summary(), post, commentTree);

    return ThreadSummaryResponse.builder()
        .postId(postId)
        .summary(normalizedSummary)
        .model(summaryResult.model())
        .generatedAt(LocalDateTime.now())
        .commentCount(buildResult.commentCount)
        .truncated(buildResult.truncated)
        .build();
  }

  private BuildResult buildThreadInput(Post post, List<CommentResponse> tree) {
    String postType = post.getType() == null ? "DISCUSSION" : post.getType().name();
    String flair = post.getFlair() == null ? "None" : safeLine(post.getFlair().getName());
    String author = resolveAuthorName(post.getUserId());
    String communityName = post.getCommunity() == null ? "Unknown" : safeLine(post.getCommunity().getName());
    int acceptedAnswers = countAcceptedAnswers(tree);
    String detectedLanguage = detectThreadLanguage(post.getTitle(), post.getContent());

    StringBuilder out = new StringBuilder();
    out.append("=== CONTEXT (do not quote in output) ===\n")
        .append("Post type: ").append(postType).append("\n")
        .append("Tags/Flair: ").append(flair).append("\n")
        .append("Username: ").append(author).append("\n")
        .append("Community: ").append(communityName).append("\n")
        .append("Accepted answers in comments: ").append(acceptedAnswers).append("\n")
        .append("Thread language: ").append(detectedLanguage).append("\n\n")
        .append("=== INSTRUCTIONS ===\n")
        .append("Respond entirely in the thread language declared above.\n")
        .append("Return only valid JSON with no markdown, no code fences, and no extra keys.\n")
        .append("Do not add recommendations, advice, or a next-step field.\n")
        .append("Do not quote or restate raw metadata labels from CONTEXT in output text.\n")
        .append(
            "Do not restate obvious facts verbatim; synthesize what changed, where participants align, and what remains unresolved.\n")
        .append("tldr.text: 15-25 words, present tense, synthesize overall thread status.\n")
        .append("keyPoints: 3-4 items, each 10-20 words, each must reference a specific fact from the thread.\n")
        .append("considerations: 2-3 items, each 8-16 words, risks or unresolved questions only.\n")
        .append("No item may repeat a fact already stated in another section.\n")
        .append("Never output template placeholders like <...>, \"text\", or \"point 1\".\n")
        .append("Use only these icon names, vary by meaning across items:\n")
        .append(
            "auto_awesome,insights,light_mode,pets,psychology,track_changes,visibility,forum,check_circle,bolt,schedule,thumb_up,priority_high,emoji_objects,school,help,question_answer,campaign,local_shipping,flag,error,warning,description,gavel,group,task_alt,label,person\n\n")
        .append("=== OUTPUT SCHEMA ===\n")
        .append("{\n")
        .append("  \"tldr\": {\"text\": \"\", \"icon\": \"\"},\n")
        .append("  \"keyPoints\": [{\"text\": \"\", \"icon\": \"\"}],\n")
        .append("  \"considerations\": [{\"text\": \"\", \"icon\": \"\"}]\n")
        .append("}\n\n")
        .append("=== THREAD ===\n")
        .append("Post title: ").append(safeLine(post.getTitle())).append("\n")
        .append("Post body: ").append(safeLine(post.getContent())).append("\n")
        .append("Comments:\n");

    Counter counter = new Counter();
    appendComments(out, tree, 0, counter);

    boolean truncated = counter.truncated;
    String prompt = out.length() > maxInputChars ? out.substring(0, maxInputChars) : out.toString();
    if (prompt.length() < out.length()) {
      truncated = true;
    }

    return new BuildResult(prompt, counter.count, truncated);
  }

  private void appendComments(StringBuilder out, List<CommentResponse> comments, int depth, Counter counter) {
    if (comments == null || comments.isEmpty()) {
      return;
    }

    String indent = "  ".repeat(Math.max(0, depth));
    for (CommentResponse comment : comments) {
      if (counter.count >= maxComments) {
        counter.truncated = true;
        return;
      }

      String content = safeLine(comment.getContent());
      if (content.isBlank() || "[deleted]".equalsIgnoreCase(content)) {
        continue;
      }

      counter.count += 1;
      out.append(indent)
          .append("Comment ")
          .append(counter.count)
          .append(" by ")
          .append(safeLine(comment.getAuthorName()))
          .append(": ")
          .append(content)
          .append("\n");

      appendComments(out, comment.getReplies(), depth + 1, counter);
      if (counter.count >= maxComments) {
        return;
      }
    }
  }

  private SummaryResult callGemini(String prompt) {
    String model = (groqModel == null || groqModel.isBlank()) ? "llama-3.1-8b-instant" : groqModel.trim();
    try {
      return callGeminiWithModel(prompt, model);
    } catch (GeminiRequestException ex) {
      throw new IllegalStateException(toClientError(ex));
    }
  }

  private SummaryResult callGeminiWithModel(String prompt, String model) {
    String url = "https://api.groq.com/openai/v1/chat/completions";

    ObjectNode requestBody = objectMapper.createObjectNode();
    requestBody.put("model", model);

    ObjectNode message = objectMapper.createObjectNode();
    message.put("role", "user");
    message.put("content", prompt);
    requestBody.set("messages", objectMapper.createArrayNode().add(message));

    requestBody.put("temperature", 0.2);
    requestBody.put("max_tokens", 768);
    ObjectNode responseFormat = objectMapper.createObjectNode();
    responseFormat.put("type", "json_object");
    requestBody.set("response_format", responseFormat);

    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(20))
        .header("Content-Type", "application/json")
        .header("Authorization", "Bearer " + groqApiKey)
        .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
        .build();

    try {
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw toGeminiRequestException(response.statusCode(), response.body());
      }

      JsonNode root = objectMapper.readTree(response.body());
      String text = root.path("choices").path(0).path("message").path("content").asText("").trim();
      if (text.isBlank()) {
        throw new IllegalStateException("AI summary is currently unavailable");
      }
      return new SummaryResult(text, model);
    } catch (GeminiRequestException ex) {
      throw ex;
    } catch (IllegalStateException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new IllegalStateException("AI summary is currently unavailable", ex);
    }
  }

  private GeminiRequestException toGeminiRequestException(int statusCode, String body) {
    String message = "AI summary request failed";
    try {
      JsonNode root = objectMapper.readTree(body);
      String apiMessage = root.path("error").path("message").asText("").trim();
      if (!apiMessage.isBlank()) {
        message = apiMessage;
      }
    } catch (Exception ignored) {
    }

    return new GeminiRequestException(statusCode, message);
  }

  private List<String> discoverGenerateContentModels(Set<String> alreadyTried) {
    String encodedKey = URLEncoder.encode(geminiApiKey, StandardCharsets.UTF_8);
    String url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + encodedKey;

    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(12))
        .header("Content-Type", "application/json")
        .GET()
        .build();

    try {
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 400) {
        throw toGeminiRequestException(response.statusCode(), response.body());
      }

      JsonNode root = objectMapper.readTree(response.body());
      List<String> discovered = new ArrayList<>();

      for (JsonNode modelNode : root.path("models")) {
        if (!supportsGenerateContent(modelNode.path("supportedGenerationMethods"))) {
          continue;
        }

        String modelId = normalizeModelName(modelNode.path("name").asText(""));
        if (modelId.isBlank()) {
          continue;
        }

        String lower = modelId.toLowerCase();
        if (!lower.startsWith("gemini")) {
          continue;
        }

        if (alreadyTried.contains(modelId)) {
          continue;
        }

        discovered.add(modelId);
      }

      discovered.sort(Comparator.comparingInt(this::modelPriority).thenComparing(String::compareTo));
      return discovered;
    } catch (GeminiRequestException ex) {
      throw ex;
    } catch (Exception ex) {
      return List.of();
    }
  }

  private boolean supportsGenerateContent(JsonNode methodsNode) {
    if (!methodsNode.isArray()) {
      return false;
    }

    for (JsonNode method : methodsNode) {
      if ("generateContent".equalsIgnoreCase(method.asText(""))) {
        return true;
      }
    }

    return false;
  }

  private String normalizeModelName(String modelName) {
    if (modelName == null) {
      return "";
    }
    String trimmed = modelName.trim();
    if (trimmed.startsWith("models/")) {
      return trimmed.substring("models/".length());
    }
    return trimmed;
  }

  private int modelPriority(String modelId) {
    String lower = modelId.toLowerCase();
    if (lower.contains("2.5") && lower.contains("flash")) {
      return 0;
    }
    if (lower.contains("2.0") && lower.contains("flash")) {
      return 1;
    }
    if (lower.contains("1.5") && lower.contains("flash")) {
      return 2;
    }
    if (lower.contains("flash")) {
      return 3;
    }
    return 10;
  }

  private boolean shouldTryDiscoveredModels(GeminiRequestException failure) {
    if (failure == null) {
      return true;
    }
    if (isApiKeyError(failure.message())) {
      return false;
    }
    return failure.statusCode() != 429 && !failure.message().toLowerCase().contains("quota");
  }

  private boolean isApiKeyError(String message) {
    String lower = message == null ? "" : message.toLowerCase();
    return lower.contains("api key not valid")
        || lower.contains("permission_denied")
        || lower.contains("request had insufficient authentication scopes")
        || lower.contains("api has not been used")
        || lower.contains("service disabled");
  }

  private String toClientError(GeminiRequestException failure) {
    String lower = failure.message().toLowerCase();

    if (isApiKeyError(failure.message())) {
      return "Groq API key is invalid or API access is disabled";
    }

    if (failure.statusCode() == 429 || lower.contains("quota")) {
      return "Groq rate/quota limit reached. Try again shortly";
    }

    if (lower.contains("not found") || lower.contains("model")) {
      return "Configured Groq model is unavailable for this API key";
    }

    return "AI summary request failed: " + failure.message();
  }

  private String extractText(JsonNode root) {
    StringBuilder builder = new StringBuilder();
    for (JsonNode candidate : root.path("candidates")) {
      JsonNode parts = candidate.path("content").path("parts");
      for (JsonNode part : parts) {
        String text = part.path("text").asText("");
        if (!text.isBlank()) {
          if (builder.length() > 0) {
            builder.append("\n\n");
          }
          builder.append(text.trim());
        }
      }
    }
    return builder.toString().trim();
  }

  private String safeLine(String value) {
    if (value == null) {
      return "";
    }
    return value.replaceAll("\\s+", " ").trim();
  }

  private String detectThreadLanguage(String title, String content) {
    String combined = (title == null ? "" : title) + " " + (content == null ? "" : content);
    if (combined.isBlank()) {
      return "English";
    }

    int arabicCount = 0;
    int cyrillicCount = 0;
    int latinCount = 0;
    int frenchAccentCount = 0;

    for (int i = 0; i < combined.length(); i++) {
      char ch = combined.charAt(i);

      if (ch >= '\u0600' && ch <= '\u06FF') {
        arabicCount++;
        continue;
      }

      Character.UnicodeScript script = Character.UnicodeScript.of(ch);
      if (script == Character.UnicodeScript.CYRILLIC) {
        cyrillicCount++;
        continue;
      }

      if (script == Character.UnicodeScript.LATIN) {
        latinCount++;
        if ("àâäæçéèêëîïôœùûüÿ".indexOf(Character.toLowerCase(ch)) >= 0) {
          frenchAccentCount++;
        }
      }
    }

    if (arabicCount > cyrillicCount && arabicCount > latinCount) {
      return "Arabic";
    }

    if (cyrillicCount > arabicCount && cyrillicCount > latinCount) {
      return "Russian";
    }

    if (latinCount == 0) {
      return "English";
    }

    String lower = " " + combined.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ") + " ";
    int frenchMarkers = frenchAccentCount
        + countKeywordHits(lower, new String[] { " le ", " la ", " les ", " de ", " des ", " du ", " et ", " pour ",
            " avec ", " une ", " un ", " pas ", " que " });
    int englishMarkers = countKeywordHits(lower,
        new String[] { " the ", " and ", " with ", " for ", " this ", " that ", " are ", " is ", " was ", " were ",
            " to " });

    if (frenchMarkers > englishMarkers) {
      return "French";
    }

    return "English";
  }

  private int countKeywordHits(String source, String[] keywords) {
    int hits = 0;
    for (String keyword : keywords) {
      int from = 0;
      while (from < source.length()) {
        int idx = source.indexOf(keyword, from);
        if (idx < 0) {
          break;
        }
        hits++;
        from = idx + keyword.length();
      }
    }
    return hits;
  }

  private String normalizeSummaryJson(String rawSummary, Post post, List<CommentResponse> commentTree) {
    if (DEBUG_SUMMARY) {
      System.err.println("[ThreadSummary] rawSummary received: " + rawSummary);
    }

    JsonNode parsed = parseSummaryJsonCandidate(rawSummary);
    if (DEBUG_SUMMARY) {
      System.err.println("[ThreadSummary] parsed ok: " + (parsed != null && parsed.isObject()));
    }

    if (parsed == null || !parsed.isObject()) {
      return buildFallbackSummaryJson(post, commentTree);
    }

    SummaryLine tldr = parseSummaryLine(parsed.path("tldr"), "auto_awesome");
    if (tldr == null) {
      tldr = parseSummaryLine(parsed.path("summary"), "auto_awesome");
    }

    List<SummaryLine> keyPoints = parseSummaryLines(parsed.path("keyPoints"), "insights");
    if (keyPoints.isEmpty()) {
      keyPoints = parseSummaryLines(parsed.path("key_points"), "insights");
    }

    List<SummaryLine> considerations = parseSummaryLines(parsed.path("considerations"), "warning");
    if (considerations.isEmpty()) {
      considerations = parseSummaryLines(parsed.path("constraints"), "warning");
    }
    if (considerations.isEmpty()) {
      considerations = parseSummaryLines(parsed.path("openQuestions"), "warning");
    }

    if (tldr == null) {
      tldr = fallbackTldr(post, commentTree);
    }

    if (keyPoints.isEmpty() && tldr == null) {
      keyPoints = fallbackKeyPoints(post, commentTree);
    }
    keyPoints = polishLines(keyPoints, 4, false);

    if (considerations.isEmpty()) {
      considerations = fallbackConsiderations(post, commentTree);
    }
    considerations = polishLines(considerations, 3, true);

    try {
      ObjectNode normalized = objectMapper.createObjectNode();
      normalized.set("tldr", toJsonLine(tldr));
      normalized.set("keyPoints", toJsonLines(keyPoints));
      normalized.set("considerations", toJsonLines(considerations));
      return objectMapper.writeValueAsString(normalized);
    } catch (Exception ex) {
      return buildFallbackSummaryJson(post, commentTree);
    }
  }

  private JsonNode parseSummaryJsonCandidate(String rawSummary) {
    if (rawSummary == null || rawSummary.isBlank()) {
      return null;
    }

    String source = rawSummary
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

  private SummaryLine parseSummaryLine(JsonNode node, String defaultIcon) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return null;
    }

    String text;
    String iconCandidate = defaultIcon;

    if (node.isObject()) {
      text = cleanSummaryText(node.path("text").asText(""));
      iconCandidate = cleanSummaryText(node.path("icon").asText(defaultIcon));
    } else {
      text = cleanSummaryText(node.asText(""));
    }

    if (isPlaceholderText(text)) {
      return null;
    }

    return new SummaryLine(text, normalizeIcon(iconCandidate, defaultIcon));
  }

  private List<SummaryLine> parseSummaryLines(JsonNode node, String defaultIcon) {
    List<SummaryLine> lines = new ArrayList<>();

    if (node == null || node.isMissingNode() || node.isNull()) {
      return lines;
    }

    if (node.isArray()) {
      for (JsonNode item : node) {
        SummaryLine line = parseSummaryLine(item, defaultIcon);
        if (line != null) {
          lines.add(line);
        }
      }
      return lines;
    }

    if (node.isTextual()) {
      String value = cleanSummaryText(node.asText(""));
      if (!value.isBlank()) {
        for (String part : value.split("\\s*[;\\n]\\s*")) {
          String candidate = cleanSummaryText(part);
          if (!isPlaceholderText(candidate)) {
            lines.add(new SummaryLine(candidate, defaultIcon));
          }
        }
      }
      return lines;
    }

    SummaryLine single = parseSummaryLine(node, defaultIcon);
    if (single != null) {
      lines.add(single);
    }

    return lines;
  }

  private ObjectNode toJsonLine(SummaryLine line) {
    ObjectNode node = objectMapper.createObjectNode();
    node.put("text", line.text());
    node.put("icon", line.icon());
    return node;
  }

  private JsonNode toJsonLines(List<SummaryLine> lines) {
    var array = objectMapper.createArrayNode();
    lines.stream().limit(4).forEach(line -> array.add(toJsonLine(line)));
    return array;
  }

  private String buildFallbackSummaryJson(Post post, List<CommentResponse> commentTree) {
    try {
      ObjectNode fallback = objectMapper.createObjectNode();
      fallback.set("tldr", toJsonLine(fallbackTldr(post, commentTree)));
      fallback.set("keyPoints", toJsonLines(fallbackKeyPoints(post, commentTree)));
      fallback.set("considerations", toJsonLines(fallbackConsiderations(post, commentTree)));
      return objectMapper.writeValueAsString(fallback);
    } catch (Exception ex) {
      return "{\"tldr\":{\"text\":\"Thread summary is temporarily unavailable.\",\"icon\":\"auto_awesome\"},\"keyPoints\":[],\"considerations\":[]}";
    }
  }

  private SummaryLine fallbackTldr(Post post, List<CommentResponse> comments) {
    int commentCount = countVisibleComments(comments);
    String title = safeLine(post.getTitle());
    String highlight = firstMeaningfulComment(comments);
    String text;

    if (commentCount == 0) {
      text = "Thread centers on \"" + title + "\" and is waiting for replies.";
    } else if (!highlight.isBlank()) {
      text = "Thread on \"" + title + "\" is active, with replies focusing on " + truncate(highlight, 90) + ".";
    } else {
      text = "Thread centers on \"" + title + "\" with " + commentCount + " active comment"
          + (commentCount > 1 ? "s" : "") + ".";
    }

    return new SummaryLine(cleanSummaryText(text), "auto_awesome");
  }

  private List<SummaryLine> fallbackKeyPoints(Post post, List<CommentResponse> comments) {
    List<SummaryLine> keyPoints = new ArrayList<>();
    String postType = post.getType() == null ? "DISCUSSION" : post.getType().name();
    String firstComment = firstMeaningfulComment(comments);
    String secondComment = secondMeaningfulComment(comments, firstComment);
    int accepted = countAcceptedAnswers(comments);
    List<String> keywords = extractTopKeywords(post, comments, 3);

    if (!keywords.isEmpty()) {
      keyPoints.add(new SummaryLine("Thread focus converges on " + String.join(", ", keywords) + ".", "insights"));
    }

    if (!firstComment.isBlank() && !secondComment.isBlank()) {
      if (areSubstantiallyDifferent(firstComment, secondComment)) {
        keyPoints.add(
            new SummaryLine("Participants compare alternative fixes while isolating which variable caused improvement.",
                "track_changes"));
      } else {
        keyPoints.add(new SummaryLine("Multiple replies reinforce the same practical fix pattern.", "forum"));
      }
    } else if (!firstComment.isBlank()) {
      keyPoints.add(new SummaryLine("Replies provide concrete operational detail beyond the original post.", "forum"));
    }

    if (accepted > 0) {
      keyPoints
          .add(new SummaryLine("An accepted response indicates a validated path for this scenario.", "check_circle"));
    } else if ("QUESTION".equalsIgnoreCase(postType)) {
      keyPoints.add(new SummaryLine("The thread is still exploratory with no single validated answer yet.", "help"));
    }

    if (keywords.isEmpty() && !firstComment.isBlank()) {
      keyPoints.add(new SummaryLine("The strongest signal comes from commenter experience rather than policy guidance.",
          "visibility"));
    }

    if (keyPoints.isEmpty()) {
      keyPoints.add(
          new SummaryLine("Discussion remains early, with limited evidence to extract deeper patterns.", "visibility"));
    }

    return keyPoints;
  }

  private List<SummaryLine> fallbackConsiderations(Post post, List<CommentResponse> comments) {
    List<SummaryLine> considerations = new ArrayList<>();
    int accepted = countAcceptedAnswers(comments);
    int commentCount = countVisibleComments(comments);
    String firstComment = firstMeaningfulComment(comments);
    String secondComment = secondMeaningfulComment(comments, firstComment);

    if (accepted == 0 && post.getType() != null && "QUESTION".equalsIgnoreCase(post.getType().name())) {
      considerations.add(new SummaryLine("No accepted answer is marked yet.", "help"));
    }

    if (commentCount <= 1) {
      considerations.add(new SummaryLine("Limited reply volume means thread consensus is still unclear.", "warning"));
    } else {
      considerations
          .add(new SummaryLine("Multiple replies exist, so details may vary across commenters.", "track_changes"));
    }

    if (!firstComment.isBlank() && !secondComment.isBlank() && areSubstantiallyDifferent(firstComment, secondComment)) {
      considerations
          .add(new SummaryLine("Reports differ in setup details, so apply fixes with context checks.", "warning"));
    }

    if (containsUrgencySignal(post, comments)) {
      considerations.add(new SummaryLine("Time sensitivity appears high, so delayed coordination may increase risk.",
          "priority_high"));
    }

    if (accepted > 0) {
      considerations.add(new SummaryLine("At least one accepted answer is already present.", "check_circle"));
    }

    if (considerations.isEmpty()) {
      considerations.add(
          new SummaryLine("Current thread details look stable with no immediate unresolved blockers.", "task_alt"));
    }

    return considerations;
  }

  private int countVisibleComments(List<CommentResponse> comments) {
    if (comments == null || comments.isEmpty()) {
      return 0;
    }

    int count = 0;
    for (CommentResponse comment : comments) {
      String content = safeLine(comment.getContent());
      if (!content.isBlank() && !"[deleted]".equalsIgnoreCase(content)) {
        count += 1;
      }
      count += countVisibleComments(comment.getReplies());
    }
    return count;
  }

  private String firstMeaningfulComment(List<CommentResponse> comments) {
    if (comments == null || comments.isEmpty()) {
      return "";
    }

    for (CommentResponse comment : comments) {
      String content = safeLine(comment.getContent());
      if (!content.isBlank() && !"[deleted]".equalsIgnoreCase(content)) {
        return content;
      }
      String reply = firstMeaningfulComment(comment.getReplies());
      if (!reply.isBlank()) {
        return reply;
      }
    }

    return "";
  }

  private List<String> extractTopKeywords(Post post, List<CommentResponse> comments, int limit) {
    Map<String, Integer> counts = new HashMap<>();

    addKeywordCounts(counts, safeLine(post.getTitle()));
    addKeywordCounts(counts, safeLine(post.getContent()));

    String first = firstMeaningfulComment(comments);
    String second = secondMeaningfulComment(comments, first);
    addKeywordCounts(counts, first);
    addKeywordCounts(counts, second);

    return counts.entrySet().stream()
        .sorted((a, b) -> {
          int byCount = Integer.compare(b.getValue(), a.getValue());
          return byCount != 0 ? byCount : a.getKey().compareTo(b.getKey());
        })
        .limit(Math.max(1, limit))
        .map(Map.Entry::getKey)
        .toList();
  }

  private void addKeywordCounts(Map<String, Integer> counts, String text) {
    if (text == null || text.isBlank()) {
      return;
    }

    for (String token : text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
      if (token.length() < 4 || KEYWORD_STOP_WORDS.contains(token)) {
        continue;
      }
      counts.put(token, counts.getOrDefault(token, 0) + 1);
    }
  }

  private boolean areSubstantiallyDifferent(String a, String b) {
    Set<String> aTokens = tokenSet(a);
    Set<String> bTokens = tokenSet(b);

    if (aTokens.isEmpty() || bTokens.isEmpty()) {
      return false;
    }

    Set<String> union = new HashSet<>(aTokens);
    union.addAll(bTokens);

    Set<String> intersection = new HashSet<>(aTokens);
    intersection.retainAll(bTokens);

    double jaccard = union.isEmpty() ? 0 : ((double) intersection.size() / (double) union.size());
    return jaccard < 0.28;
  }

  private Set<String> tokenSet(String text) {
    Set<String> tokens = new HashSet<>();
    if (text == null || text.isBlank()) {
      return tokens;
    }

    for (String token : text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
      if (token.length() < 4 || KEYWORD_STOP_WORDS.contains(token)) {
        continue;
      }
      tokens.add(token);
    }

    return tokens;
  }

  private boolean containsUrgencySignal(Post post, List<CommentResponse> comments) {
    String combined = String.join(" ",
        safeLine(post.getTitle()),
        safeLine(post.getContent()),
        firstMeaningfulComment(comments),
        secondMeaningfulComment(comments, firstMeaningfulComment(comments)))
        .toLowerCase(Locale.ROOT);

    return combined.contains("urgent")
        || combined.contains("asap")
        || combined.contains("tonight")
        || combined.contains("immediately")
        || combined.contains("deadline")
        || combined.contains("before");
  }

  private List<SummaryLine> polishLines(List<SummaryLine> lines, int maxItems, boolean considerations) {
    List<SummaryLine> polished = new ArrayList<>();
    Set<String> seen = new HashSet<>();

    for (SummaryLine line : lines) {
      if (line == null) {
        continue;
      }

      String text = cleanSummaryText(line.text());
      if (text.isBlank()) {
        continue;
      }

      text = text.replaceFirst("(?i)^post context:\\s*", "")
          .replaceFirst("(?i)^comment highlight:\\s*", "")
          .replaceFirst("(?i)^follow-up detail:\\s*", "");

      if (text.length() < 8 && !considerations) {
        continue;
      }

      String key = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
      if (!seen.add(key)) {
        continue;
      }

      polished.add(new SummaryLine(text, normalizeIcon(line.icon(), considerations ? "warning" : "insights")));
      if (polished.size() >= maxItems) {
        break;
      }
    }

    return polished;
  }

  private String secondMeaningfulComment(List<CommentResponse> comments, String firstMatch) {
    if (comments == null || comments.isEmpty()) {
      return "";
    }

    boolean foundFirst = firstMatch == null || firstMatch.isBlank();
    for (CommentResponse comment : comments) {
      String content = safeLine(comment.getContent());
      if (!content.isBlank() && !"[deleted]".equalsIgnoreCase(content)) {
        if (foundFirst && !content.equals(firstMatch)) {
          return content;
        }
        if (content.equals(firstMatch)) {
          foundFirst = true;
        }
      }

      String reply = secondMeaningfulComment(comment.getReplies(), firstMatch);
      if (!reply.isBlank() && !reply.equals(firstMatch)) {
        return reply;
      }
    }

    return "";
  }

  private String cleanSummaryText(String value) {
    if (value == null) {
      return "";
    }
    return value.replaceAll("\\s+", " ").trim();
  }

  private boolean isPlaceholderText(String value) {
    String text = cleanSummaryText(value);
    if (text.isBlank()) {
      return true;
    }

    String normalized = text.toLowerCase(Locale.ROOT)
        .replaceAll("[\"'`]+", "")
        .replaceAll("\\s+", " ")
        .trim();

    if (normalized.matches("<[^>]+>")) {
      return true;
    }

    return normalized.equals("text")
        || normalized.equals("one sentence")
        || normalized.equals("point 1")
        || normalized.equals("point 2")
        || normalized.equals("point 3")
        || normalized.equals("summary")
        || normalized.equals("summary available below.")
        || normalized.startsWith("constraint, unresolved point");
  }

  private String normalizeIcon(String value, String fallback) {
    String icon = cleanSummaryText(value).toLowerCase(Locale.ROOT).replace(' ', '_');
    icon = ICON_ALIASES.getOrDefault(icon, icon);
    if (ALLOWED_SUMMARY_ICONS.contains(icon)) {
      return icon;
    }

    String fallbackIcon = cleanSummaryText(fallback).toLowerCase(Locale.ROOT).replace(' ', '_');
    fallbackIcon = ICON_ALIASES.getOrDefault(fallbackIcon, fallbackIcon);
    if (ALLOWED_SUMMARY_ICONS.contains(fallbackIcon)) {
      return fallbackIcon;
    }

    return "auto_awesome";
  }

  private String truncate(String value, int max) {
    String text = cleanSummaryText(value);
    if (text.length() <= max) {
      return text;
    }

    int cutAt = text.lastIndexOf(' ', max - 1);
    if (cutAt < max / 2) {
      cutAt = max - 1;
    }
    return text.substring(0, cutAt).trim() + "...";
  }

  private int countAcceptedAnswers(List<CommentResponse> comments) {
    if (comments == null || comments.isEmpty()) {
      return 0;
    }

    int count = 0;
    for (CommentResponse comment : comments) {
      if (comment.isAcceptedAnswer()) {
        count += 1;
      }
      count += countAcceptedAnswers(comment.getReplies());
    }

    return count;
  }

  private String resolveAuthorName(Long userId) {
    if (userId == null) {
      return "Unknown";
    }

    return userRepository.findById(userId)
        .map(this::formatAuthorName)
        .orElse("Unknown");
  }

  private String formatAuthorName(User user) {
    String first = normalizeOptional(user.getFirstName());
    String last = normalizeOptional(user.getLastName());

    String joined = String.join(" ",
        first == null ? "" : first,
        last == null ? "" : last).trim();

    return joined.isEmpty() ? "Unknown" : joined;
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }

    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private record BuildResult(String prompt, int commentCount, boolean truncated) {
  }

  private static final class Counter {
    private int count;
    private boolean truncated;
  }

  private record SummaryResult(String summary, String model) {
  }

  private record SummaryLine(String text, String icon) {
  }

  private static final class GeminiRequestException extends RuntimeException {
    private final int statusCode;

    private GeminiRequestException(int statusCode, String message) {
      super(message == null ? "" : message);
      this.statusCode = statusCode;
    }

    private int statusCode() {
      return statusCode;
    }

    private String message() {
      return getMessage() == null ? "" : getMessage();
    }
  }
}
