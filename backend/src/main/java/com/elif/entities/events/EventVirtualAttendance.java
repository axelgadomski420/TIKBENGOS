package com.elif.entities.events;

import com.elif.entities.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "event_virtual_attendance",
        indexes = {
                @Index(name = "idx_attendance_session", columnList = "session_id"),
                @Index(name = "idx_attendance_participant", columnList = "participant_id"),
                @Index(name = "idx_attendance_user", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventVirtualAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "certificate_token", length = 100)
    private String certificateToken;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private EventVirtualSession session;

    // ✅ CORRECTION ICI
    @ManyToOne(fetch = FetchType.LAZY, optional = true)  // ← Changé
    @JoinColumn(name = "participant_id", nullable = true)  // ← Changé
    private EventParticipant participant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Builder.Default
    @Column(name = "total_seconds_present", nullable = false)
    private long totalSecondsPresent = 0L;

    @Column(name = "is_moderator", nullable = false)
    @Builder.Default
    private boolean isModerator = false;

    @Column(name = "attendance_percent")
    private Double attendancePercent;

    @Builder.Default
    @Column(name = "certificate_earned", nullable = false)
    private boolean certificateEarned = false;

    @Column(name = "certificate_url", length = 500)
    private String certificateUrl;

    // ─── Méthodes métier ──────────────────────────────────────────

    public void recordLeave() {
        this.leftAt = LocalDateTime.now();
        if (this.joinedAt != null) {
            long seconds = Duration.between(this.joinedAt, this.leftAt).toSeconds();
            this.totalSecondsPresent += Math.max(0, seconds);
        }
    }

    public void computeAttendance(long eventDurationSeconds, int threshold) {
        if (eventDurationSeconds <= 0) {
            this.attendancePercent = 0.0;
            return;
        }
        double percent = (this.totalSecondsPresent * 100.0) / eventDurationSeconds;
        this.attendancePercent = Math.min(100.0, Math.round(percent * 10.0) / 10.0);
        this.certificateEarned = this.attendancePercent >= threshold;
    }

    public boolean isCurrentlyConnected() {
        return this.leftAt == null;
    }
}