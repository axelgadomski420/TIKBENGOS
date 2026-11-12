package com.elif.repositories.community;

import com.elif.entities.community.CommunityRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityRuleRepository extends JpaRepository<CommunityRule, Long> {

    List<CommunityRule> findByCommunityIdOrderByRuleOrderAsc(Long communityId);

    java.util.Optional<CommunityRule> findByIdAndCommunityId(Long id, Long communityId);
}
