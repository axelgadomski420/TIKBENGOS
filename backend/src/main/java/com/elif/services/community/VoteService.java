package com.elif.services.community;

import com.elif.entities.community.Comment;
import com.elif.entities.community.Post;
import com.elif.entities.community.Vote;
import com.elif.entities.community.enums.TargetType;
import com.elif.repositories.community.CommentRepository;
import com.elif.repositories.community.PostRepository;
import com.elif.repositories.community.VoteRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@AllArgsConstructor
@Transactional
public class VoteService {

    private final VoteRepository voteRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public void castVote(Long userId, Long targetId, TargetType targetType, int value) {
        if (value != 1 && value != -1) {
            throw new IllegalArgumentException("Vote value must be +1 or -1");
        }

        Optional<Vote> existing = voteRepository.findByUserIdAndTargetIdAndTargetType(userId, targetId, targetType);

        int delta;
        if (existing.isPresent()) {
            Vote vote = existing.get();
            delta = value - vote.getValue();
            vote.setValue(value);
            voteRepository.save(vote);
        } else {
            voteRepository.save(Vote.builder()
                    .userId(userId)
                    .targetId(targetId)
                    .targetType(targetType)
                    .value(value)
                    .build());
            delta = value;
        }

        applyDelta(targetId, targetType, delta);
    }

    public void removeVote(Long userId, Long targetId, TargetType targetType) {
        voteRepository.findByUserIdAndTargetIdAndTargetType(userId, targetId, targetType)
                .ifPresent(v -> {
                    applyDelta(targetId, targetType, -v.getValue());
                    voteRepository.delete(v);
                });
    }

    private void applyDelta(Long targetId, TargetType targetType, int delta) {
        if (delta == 0) {
            return;
        }

        if (targetType == TargetType.POST) {
            Post post = postRepository.findById(targetId)
                    .orElseThrow(() -> new IllegalArgumentException("Post not found"));
            post.setVoteScore(post.getVoteScore() + delta);
            postRepository.save(post);
        } else {
            Comment comment = commentRepository.findById(targetId)
                    .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
            comment.setVoteScore(comment.getVoteScore() + delta);
            commentRepository.save(comment);
        }
    }
}
