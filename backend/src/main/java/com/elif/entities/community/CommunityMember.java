package com.elif.entities.community;

import com.elif.entities.community.enums.MemberRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_member", uniqueConstraints = @UniqueConstraint(columnNames = { "community_id", "user_id" }))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Community community;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    @Column(name = "email_on_post_reply", nullable = false)
    @Builder.Default
    private boolean emailOnPostReply = true;

    @Column(name = "email_on_mention", nullable = false)
    @Builder.Default
    private boolean emailOnMention = true;

    @Column(name = "email_on_unread_direct_message", nullable = false)
    @Builder.Default
    private boolean emailOnUnreadDirectMessage = true;

    @Column(name = "weekly_digest_enabled", nullable = false)
    @Builder.Default
    private boolean weeklyDigestEnabled = false;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;
}
