package com.elif.dto.events.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventCategoryResponse {
    private Long id;
    private String name;
    private String icon;
    private String description;
    private Boolean requiresApproval;
    private Boolean competitionMode;// ✅ exposé au frontend
}