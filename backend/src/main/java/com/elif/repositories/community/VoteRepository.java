package com.elif.repositories.community;

import com.elif.entities.community.Vote;
import com.elif.entities.community.enums.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findByUserIdAndTargetIdAndTargetType(Long userId, Long targetId, TargetType targetType);

    boolean existsByUserIdAndTargetIdAndTargetType(Long userId, Long targetId, TargetType targetType);

    void deleteByTargetTypeAndTargetId(TargetType targetType, Long targetId);
}
