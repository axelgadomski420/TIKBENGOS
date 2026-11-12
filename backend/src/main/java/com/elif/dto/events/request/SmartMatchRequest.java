package com.elif.dto.events.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmartMatchRequest {

    @NotBlank(message = "Query must not be empty")
    @Size(min = 5, max = 500, message = "Query must be between 5 and 500 characters")
    private String query;

    private Long categoryId;
    private int maxEvents = 20;
}