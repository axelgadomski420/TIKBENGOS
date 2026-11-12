package com.elif.controllers.community;

import com.elif.dto.community.request.VoteRequest;
import com.elif.services.community.VoteService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/community")
@AllArgsConstructor
public class VoteController {

    private final VoteService voteService;

    @PostMapping("/vote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void castVote(@RequestBody VoteRequest request, @RequestHeader("X-User-Id") Long userId) {
        voteService.castVote(userId, request.getTargetId(), request.getTargetType(), request.getValue());
    }

    @DeleteMapping("/vote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeVote(@RequestBody VoteRequest request, @RequestHeader("X-User-Id") Long userId) {
        voteService.removeVote(userId, request.getTargetId(), request.getTargetType());
    }
}
