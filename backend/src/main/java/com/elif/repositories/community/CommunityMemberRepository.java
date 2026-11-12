package com.elif.repositories.community;

import com.elif.entities.community.CommunityMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, Long> {

    @EntityGraph(attributePaths = "community")
    Optional<CommunityMember> findByCommunityIdAndUserId(Long communityId, Long userId);

    boolean existsByCommunityIdAndUserId(Long communityId, Long userId);

    @EntityGraph(attributePaths = "community")
    List<CommunityMember> findByCommunityId(Long communityId);

    @EntityGraph(attributePaths = "community")
    List<CommunityMember> findByUserId(Long userId);

    @EntityGraph(attributePaths = "community")
    List<CommunityMember> findByWeeklyDigestEnabledTrue();

    @EntityGraph(attributePaths = "community")
    Optional<CommunityMember> findByCommunitySlugAndUserId(String slug, Long userId);
}
