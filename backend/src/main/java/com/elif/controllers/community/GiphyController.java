package com.elif.controllers.community;

import com.elif.dto.community.response.GifResponse;
import com.elif.services.community.GiphyService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/community/gifs")
@AllArgsConstructor
public class GiphyController {

    private final GiphyService giphyService;

    @GetMapping("/search")
    public List<GifResponse> search(@RequestParam("q") String query,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        return giphyService.search(query, limit);
    }
}