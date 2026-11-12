package com.elif.services.events.interfaces;

import com.elif.dto.events.request.AiGenerationRequest;
import com.elif.dto.events.response.AiGenerationResponse;
import com.elif.dto.events.response.AiStreamChunkDto;
import reactor.core.publisher.Flux;

public interface IAiDescriptionService {
    Flux<AiStreamChunkDto> generateDescriptionStream(AiGenerationRequest request);
    AiGenerationResponse generateDescriptionSync(AiGenerationRequest request);
}