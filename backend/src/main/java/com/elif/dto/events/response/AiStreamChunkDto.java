package com.elif.dto.events.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiStreamChunkDto {
    private String type;    // "token", "done", "error"
    private String content;
}