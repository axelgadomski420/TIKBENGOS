package com.elif.controllers.events;

import com.elif.dto.events.request.AiGenerationRequest;
import com.elif.dto.events.response.AiGenerationResponse;
import com.elif.dto.events.response.AiStreamChunkDto;
import com.elif.services.events.interfaces.IAiDescriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/events/ai")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class AiDescriptionController {

    private final IAiDescriptionService aiDescriptionService;

    @PostMapping(value = "/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiStreamChunkDto> generateDescriptionStream(@RequestBody AiGenerationRequest request) {
        log.info("🎨 AI generation request for: {}", request.getTitle());
        return aiDescriptionService.generateDescriptionStream(request);
    }

    @PostMapping("/generate-sync")
    public ResponseEntity<AiGenerationResponse> generateDescriptionSync(@RequestBody AiGenerationRequest request) {
        log.info("🎨 AI generation sync request for: {}", request.getTitle());
        AiGenerationResponse response = aiDescriptionService.generateDescriptionSync(request);
        return ResponseEntity.ok(response);
    }
}