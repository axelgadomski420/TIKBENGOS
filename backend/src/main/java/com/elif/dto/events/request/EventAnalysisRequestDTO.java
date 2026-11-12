package com.elif.dto.events.request;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class EventAnalysisRequestDTO {
    private String title;
    private String description;
    private LocalDateTime date;
    private String location;
    private List<String> animalTypes = new ArrayList<>();
    private int maxCapacity;
    private String previousAnalysis;
    private List<String> appliedChanges = new ArrayList<>();
    private String instruction;
}
