package com.elif.controllers.community;

import com.elif.dto.community.request.CreatePostRequest;
import com.elif.dto.community.response.NaturalLanguageSearchResponse;
import com.elif.dto.community.response.PostResponse;
import com.elif.dto.community.response.ThreadSummaryResponse;
import com.elif.entities.community.enums.PostType;
import com.elif.entities.community.enums.SortMode;
import com.elif.entities.community.enums.SortWindow;
import com.elif.services.community.NaturalLanguageSearchService;
import com.elif.services.community.PostService;
import com.elif.services.community.ThreadSummaryService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@AllArgsConstructor
public class PostController {

    private final PostService postService;
    private final ThreadSummaryService threadSummaryService;
    private final NaturalLanguageSearchService naturalLanguageSearchService;

    @GetMapping("/communities/{id}/posts")
    public List<PostResponse> getPosts(@PathVariable("id") Long id,
            @RequestParam(value = "sort", defaultValue = "HOT") SortMode sort,
            @RequestParam(value = "window", defaultValue = "ALL") SortWindow window,
            @RequestParam(value = "flairId", required = false) Long flairId,
            @RequestParam(value = "type", required = false) PostType type,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return postService.getPosts(id, sort, window, flairId, type, userId);
    }

    @GetMapping("/posts/{id:\\d+}")
    public PostResponse getPost(@PathVariable("id") Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return postService.getPost(id, userId);
    }

    @GetMapping("/posts/trending")
    public List<PostResponse> getTrendingPosts(@RequestParam(value = "sort", defaultValue = "HOT") SortMode sort,
            @RequestParam(value = "window", defaultValue = "ALL") SortWindow window,
            @RequestParam(value = "limit", required = false) Integer limit,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return postService.getTrendingPosts(sort, window, limit, userId);
    }

    @PostMapping("/communities/{id}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse createPost(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader(value = "X-Act-As-User-Id", required = false) Long actingUserId,
            @RequestBody CreatePostRequest request) {
        return postService.createPost(id, userId, actingUserId, request);
    }

    @PutMapping("/posts/{id:\\d+}")
    public PostResponse updatePost(@PathVariable("id") Long id,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody CreatePostRequest request) {
        return postService.updatePost(id, userId, request);
    }

    @DeleteMapping("/posts/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        postService.softDeletePost(id, userId);
    }

    @PostMapping("/posts/{id:\\d+}/pin")
    public PostResponse pinPost(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        return postService.setPinned(id, userId, true);
    }

    @DeleteMapping("/posts/{id:\\d+}/pin")
    public PostResponse unpinPost(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        return postService.setPinned(id, userId, false);
    }

    @DeleteMapping("/posts/{id:\\d+}/hard")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void hardDeletePost(@PathVariable("id") Long id, @RequestHeader("X-User-Id") Long userId) {
        postService.hardDeletePost(id, userId);
    }

    @GetMapping("/posts/search")
    public List<PostResponse> search(@RequestParam("q") String query,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return postService.search(query, userId);
    }

    @GetMapping("/posts/ask")
    public NaturalLanguageSearchResponse ask(
            @RequestParam("q") String query,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return naturalLanguageSearchService.ask(query, userId);
    }

    @GetMapping("/posts/{id:\\d+}/summary")
    public ThreadSummaryResponse summarizePostThread(
            @PathVariable("id") Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return threadSummaryService.summarizePostThread(id, userId);
    }
}
