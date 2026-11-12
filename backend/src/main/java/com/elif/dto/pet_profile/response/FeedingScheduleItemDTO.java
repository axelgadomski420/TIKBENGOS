package com.elif.dto.pet_profile.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedingScheduleItemDTO {
    private String time;                // e.g., "8:00 AM"
    private String note;                // e.g., "Serve breakfast with fresh water"
}
