package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FlairResponse {
    private Long id;
    private String name;
    private String color;
    private String textColor;
}
