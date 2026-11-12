package com.elif.dto.pet_profile.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealSectionDTO {
    private String title;               // e.g., "Breakfast", "Lunch", "Dinner"
    private Integer totalCalories;      // Sum of all items in this section
    private List<MealItemDTO> items;    // Individual meal components
    private String notes;               // Optional serving notes
}
