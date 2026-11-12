package com.elif.dto.community.request;

import com.elif.entities.community.enums.TargetType;
import lombok.Data;

@Data
public class VoteRequest {
    private Long targetId;
    private TargetType targetType;
    private int value;
}
