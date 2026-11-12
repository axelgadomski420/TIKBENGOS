package com.elif.controllers.ai;

import com.elif.services.ai.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/chatbot")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    // ============================================================
    // POST /api/ai/chatbot/message
    // Body: { systemPrompt, history, message }
    // ============================================================

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request) {
        String reply = chatbotService.chat(
                request.systemPrompt(),
                request.history(),
                request.message()
        );
        return ResponseEntity.ok(new ChatResponse(reply));
    }

    // ── Records ──

    public record ChatRequest(
            String systemPrompt,
            List<Map<String, String>> history,
            String message
    ) {}

    public record ChatResponse(String reply) {}
}