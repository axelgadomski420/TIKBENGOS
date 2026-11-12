package com.elif.controllers.community;

import com.elif.dto.community.request.CreateCommentRequest;
import com.elif.dto.community.response.CommentResponse;
import com.elif.services.community.CommentService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@AllArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/posts/{postId}/comments")
    public List<CommentResponse> getComments(@PathVariable("postId") Long postId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return commentService.getCommentTree(postId, userId);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(@PathVariable("postId") Long postId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CreateCommentRequest request) {
        return commentService.createComment(postId, userId, request);
    }

    @PutMapping("/comments/{id}")
    public CommentResponse updateComment(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CreateCommentRequest request) {
        return commentService.updateComment(id, userId, request);
    }

    @DeleteMapping("/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        commentService.softDeleteComment(id, userId);
    }

    @PostMapping("/comments/{id}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acceptAnswer(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        commentService.acceptAnswer(id, userId);
    }
}
