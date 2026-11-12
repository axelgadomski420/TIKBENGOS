package com.elif.dto.events.response;

import com.elif.entities.events.WaitlistStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WaitlistResponse {
    private Long id;
    private Long eventId;
    private String eventTitle;
    private Long userId;
    private String userName;
    private int numberOfSeats;
    private int position;
    private long peopleAhead;
    private LocalDateTime joinedAt;

    @Deprecated
    private boolean notified;

    private WaitlistStatus status;
    private LocalDateTime notifiedAt;
    private LocalDateTime confirmationDeadline;
    private Long minutesRemainingToConfirm;
    private String statusMessage;
}