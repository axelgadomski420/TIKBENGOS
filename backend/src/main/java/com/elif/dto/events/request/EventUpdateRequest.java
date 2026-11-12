package com.elif.dto.events.request;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventUpdateRequest {
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer maxParticipants;
    private Long categoryId;
    private String coverImageUrl;
    private MultipartFile image;
    @Builder.Default
    private Boolean isOnline = false;
    private String scoringCriteria;
    private String judgeRequirements;
    private Integer judgesCount;
    private LocalDateTime submissionDeadline;

    public Map<String, Object> dynamicFields() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("scoringCriteria", scoringCriteria);
        values.put("judgeRequirements", judgeRequirements);
        values.put("judgesCount", judgesCount);
        values.put("submissionDeadline", submissionDeadline);
        return values;
    }
}
