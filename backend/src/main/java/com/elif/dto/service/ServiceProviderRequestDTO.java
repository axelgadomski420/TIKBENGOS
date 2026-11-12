package com.elif.dto.service;

import com.elif.entities.service.ServiceProviderRequest.RequestStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceProviderRequestDTO {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String phone;
    private String cvUrl;
    private String description;
    private RequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;

    // ── Analyse intelligente du CV ───────────────────────────────────────────
    private String cvSummary;
    private Double coherenceScore;
    private List<MissionMatchDTO> missions;
}
