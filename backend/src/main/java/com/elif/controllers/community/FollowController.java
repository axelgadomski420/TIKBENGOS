package com.elif.controllers.community;

import com.elif.dto.community.request.FollowRequest;
import com.elif.entities.community.Follow;
import com.elif.services.community.FollowService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@AllArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void follow(@RequestHeader("X-User-Id") Long userId, @RequestBody FollowRequest request) {
        followService.follow(userId, request);
    }

    @DeleteMapping("/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(@RequestHeader("X-User-Id") Long userId, @RequestBody FollowRequest request) {
        followService.unfollow(userId, request);
    }

    @GetMapping("/follow")
    public List<Follow> list(@RequestHeader("X-User-Id") Long userId,
                             @RequestParam(defaultValue = "USER") String type) {
        return followService.list(userId, type);
    }
}
