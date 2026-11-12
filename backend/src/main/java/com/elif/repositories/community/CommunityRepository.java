package com.elif.repositories.community;

import com.elif.entities.community.Community;
import com.elif.entities.community.enums.CommunityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityRepository extends JpaRepository<Community, Long> {

    Optional<Community> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Community> findByTypeOrderByMemberCountDesc(CommunityType type);

    List<Community> findTop8ByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrderByMemberCountDesc(
            String nameKeyword,
            String descriptionKeyword);
}
