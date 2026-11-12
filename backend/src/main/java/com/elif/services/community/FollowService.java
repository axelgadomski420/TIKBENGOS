package com.elif.services.community;

import com.elif.dto.community.request.FollowRequest;
import com.elif.entities.community.Follow;
import com.elif.repositories.community.FollowRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class FollowService {

    private final FollowRepository followRepository;

    public void follow(Long userId, FollowRequest request) {
        boolean exists = followRepository.existsByFollowerIdAndFolloweeIdAndFollowType(
                userId, request.getFolloweeId(), request.getFollowType());

        if (!exists) {
            followRepository.save(Follow.builder()
                    .followerId(userId)
                    .followeeId(request.getFolloweeId())
                    .followType(request.getFollowType())
                    .build());
        }
    }

    public void unfollow(Long userId, FollowRequest request) {
        followRepository.deleteByFollowerIdAndFolloweeIdAndFollowType(
                userId, request.getFolloweeId(), request.getFollowType());
    }

    public List<Follow> list(Long userId, String type) {
        return followRepository.findByFollowerIdAndFollowType(
                userId,
                com.elif.entities.community.enums.FollowType.valueOf(type.toUpperCase())
        );
    }
}
