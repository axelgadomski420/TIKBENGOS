package com.elif.dto.adoption.request;

import lombok.Data;

@Data
public class AdminStatisticsRequestDTO {
    private String period; // DAILY, WEEKLY, MONTHLY, YEARLY
    private Long shelterId;
    private Boolean includeDetails;
}