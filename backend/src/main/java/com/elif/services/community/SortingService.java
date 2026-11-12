package com.elif.services.community;

import com.elif.entities.community.Post;
import com.elif.entities.community.enums.SortMode;
import com.elif.entities.community.enums.SortWindow;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;

@Service
public class SortingService {

        public double hotScore(int voteScore, LocalDateTime createdAt) {
                long hours = ChronoUnit.HOURS.between(createdAt, LocalDateTime.now());
                return voteScore / Math.pow(hours + 2, 1.5);
        }

        public List<Post> sort(List<Post> posts, SortMode mode, SortWindow window) {
                List<Post> filtered = filterByWindow(posts, window);
                Comparator<Post> pinnedFirst = Comparator.comparing(Post::isPinned).reversed();
                Comparator<Post> modeComparator = switch (mode) {
                        case HOT -> (a, b) -> Double.compare(
                                        hotScore(b.getVoteScore(), b.getCreatedAt()),
                                        hotScore(a.getVoteScore(), a.getCreatedAt()));
                        case NEW -> Comparator.comparing(Post::getCreatedAt).reversed();
                        case TOP -> Comparator.comparingInt(Post::getVoteScore).reversed();
                        case CONTROVERSIAL -> Comparator.comparingInt(Post::getVoteScore);
                };

                return switch (mode) {
                        case CONTROVERSIAL -> filtered.stream()
                                        .filter(p -> p.getVoteScore() < 0)
                                        .sorted(pinnedFirst.thenComparing(modeComparator))
                                        .toList();
                        default -> filtered.stream()
                                        .sorted(pinnedFirst.thenComparing(modeComparator))
                                        .toList();
                };
        }

        private List<Post> filterByWindow(List<Post> posts, SortWindow window) {
                SortWindow effectiveWindow = window == null ? SortWindow.ALL : window;
                if (effectiveWindow == SortWindow.ALL) {
                        return posts;
                }

                LocalDate today = LocalDate.now();
                LocalDateTime start = switch (effectiveWindow) {
                        case TODAY -> today.atStartOfDay();
                        case WEEK -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
                        case MONTH -> today.withDayOfMonth(1).atStartOfDay();
                        case YEAR -> today.withDayOfYear(1).atStartOfDay();
                        case ALL -> null;
                };

                LocalDateTime end = switch (effectiveWindow) {
                        case TODAY -> today.plusDays(1).atStartOfDay();
                        case WEEK -> today.with(TemporalAdjusters.next(DayOfWeek.MONDAY)).atStartOfDay();
                        case MONTH -> today.withDayOfMonth(1).plusMonths(1).atStartOfDay();
                        case YEAR -> today.withDayOfYear(1).plusYears(1).atStartOfDay();
                        case ALL -> null;
                };

                if (start == null || end == null) {
                        return posts;
                }

                return posts.stream()
                                .filter(post -> post.getCreatedAt() != null
                                                && !post.getCreatedAt().isBefore(start)
                                                && post.getCreatedAt().isBefore(end))
                                .toList();
        }
}
