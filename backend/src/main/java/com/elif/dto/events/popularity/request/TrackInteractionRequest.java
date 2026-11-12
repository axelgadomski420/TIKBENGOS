package com.elif.dto.events.popularity.request;

import com.elif.entities.events.InteractionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TrackInteractionRequest(
        @NotNull(message = "Interaction type is required")
        InteractionType type,

        Long userId,

        @NotNull(message = "Session ID is required")
        @Size(min = 1, max = 64)
        String sessionId
) {}