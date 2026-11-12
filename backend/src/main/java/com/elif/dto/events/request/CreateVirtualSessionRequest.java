package com.elif.dto.events.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class CreateVirtualSessionRequest {

    @Min(0) @Max(60)
    private int earlyAccessMinutes = 15;

    @Min(1) @Max(100)
    private int attendanceThresholdPercent = 80;

    /**
     * URL externe optionnelle (ex: lien Zoom fourni par l'organisateur).
     * Si null → le backend génère une URL interne.
     */
    private String externalRoomUrl;
}
