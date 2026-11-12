package com.elif.repositories.community;

import com.elif.entities.community.Follow;
import com.elif.entities.community.enums.FollowType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFolloweeIdAndFollowType(Long followerId, Long followeeId, FollowType type);

    List<Follow> findByFollowerIdAndFollowType(Long followerId, FollowType type);

    void deleteByFollowerIdAndFolloweeIdAndFollowType(Long followerId, Long followeeId, FollowType type);
}
