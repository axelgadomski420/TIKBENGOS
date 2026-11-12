package com.elif.repositories.community;

import com.elif.entities.community.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    int countByPostIdAndDeletedAtIsNull(Long postId);

    List<Comment> findByPostIdAndParentCommentIsNullAndDeletedAtIsNull(Long postId);

    List<Comment> findByParentCommentIdAndDeletedAtIsNull(Long parentCommentId);

    List<Comment> findByPostId(Long postId);

    List<Comment> findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long postId);

    List<Comment> findByPostIdAndAcceptedAnswerTrue(Long postId);

    void deleteAllByPostId(Long postId);
}
