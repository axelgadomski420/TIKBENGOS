package com.elif.dto.pet_transit.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskIssueDto {
    private String issue;
    private String impact;
    private String action;
}
