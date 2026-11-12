package com.elif.entities.community;

import com.elif.entities.community.enums.TargetType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "community_vote", uniqueConstraints = @UniqueConstraint(name = "uq_vote", columnNames = {"user_id", "target_id", "target_type"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Column(nullable = false)
    private int value;
}
