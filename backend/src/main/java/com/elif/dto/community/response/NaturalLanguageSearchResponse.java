package com.elif.dto.community.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class NaturalLanguageSearchResponse {
    private String query;
    private String normalizedQuery;
    private String answer;
    private String model;
    private boolean aiEnhanced;
    private List<String> followUps;
    private List<PostResponse> posts;
}
