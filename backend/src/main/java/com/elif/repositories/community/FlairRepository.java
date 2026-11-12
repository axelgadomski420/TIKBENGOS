package com.elif.repositories.community;

import com.elif.entities.community.Flair;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FlairRepository extends JpaRepository<Flair, Long> {

    List<Flair> findByCommunityId(Long communityId);

    Optional<Flair> findByIdAndCommunityId(Long id, Long communityId);

    List<Flair> findTop12ByNameContainingIgnoreCase(String keyword);
}
