package com.elif.entities.events;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.time.Duration;

import com.elif.entities.user.User;

@Entity
@Table(
        name = "event_waitlist",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_waitlist_event_user",
                columnNames = {"event_id", "user_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventWaitlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Column(nullable = false)
    private int numberOfSeats;

    @Column(nullable = false)
    private int position;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Deprecated
    @Builder.Default
    @Column(nullable = false)
    private boolean notified = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private WaitlistStatus status = WaitlistStatus.WAITING;

    private LocalDateTime notifiedAt;
    private LocalDateTime confirmationDeadline;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_participant_id")
    private EventParticipant confirmedParticipant;

    public void notifyWithDeadline(int deadlineHours) {
        this.status = WaitlistStatus.NOTIFIED;
        this.notifiedAt = LocalDateTime.now();
        this.confirmationDeadline = this.notifiedAt.plusHours(deadlineHours);
        this.notified = true;
    }

    public boolean isDeadlineExpired() {
        return this.confirmationDeadline != null
                && LocalDateTime.now().isAfter(this.confirmationDeadline);
    }

    public Long getMinutesRemaining() {
        if (this.status != WaitlistStatus.NOTIFIED || this.confirmationDeadline == null) {
            return null;
        }
        if (isDeadlineExpired()) {
            return 0L;
        }
        return Duration.between(LocalDateTime.now(), this.confirmationDeadline).toMinutes();
    }

    public void confirm(EventParticipant participant) {
        this.status = WaitlistStatus.CONFIRMED;
        this.confirmedParticipant = participant;
    }

    public void cancel() {
        this.status = WaitlistStatus.CANCELLED;
    }

    public void expire() {
        this.status = WaitlistStatus.EXPIRED;
    }
}