package com.elif.repositories.community;

import com.elif.entities.community.Post;
import com.elif.entities.community.enums.PostType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByDeletedAtIsNull();

    List<Post> findByCommunityIdAndDeletedAtIsNull(Long communityId);

    List<Post> findByCommunityId(Long communityId);

    List<Post> findByCommunityIdAndFlairIdAndDeletedAtIsNull(Long communityId, Long flairId);

    List<Post> findByCommunityIdAndFlairId(Long communityId, Long flairId);

    List<Post> findByCommunityIdAndTypeAndDeletedAtIsNull(Long communityId, PostType type);

    List<Post> findByDeletedAtIsNullAndTitleContainingIgnoreCaseOrDeletedAtIsNullAndContentContainingIgnoreCase(
            String titleKeyword,
            String contentKeyword);
}
