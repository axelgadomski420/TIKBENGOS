package com.elif.controllers.events;

import com.elif.dto.events.request.EventCategoryRequest;
import com.elif.dto.events.response.EventCategoryResponse;
import com.elif.entities.user.Role;
import com.elif.services.events.interfaces.IEventCategoryService;
import com.elif.services.user.IUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/event-categories")
@RequiredArgsConstructor
public class EventCategoryController {

    private final IEventCategoryService categoryService;
    private final IUserService          userService;

    /** GET /api/event-categories — Liste toutes les catégories (public) */
    @GetMapping
    public ResponseEntity<List<EventCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    /** GET /api/event-categories/{id} — Détail d'une catégorie (public) */
    @GetMapping("/{id}")
    public ResponseEntity<EventCategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    /** POST /api/event-categories — Créer une catégorie (ADMIN) */
    @PostMapping
    public ResponseEntity<EventCategoryResponse> createCategory(
            @Valid @RequestBody EventCategoryRequest request,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.createCategory(request));
    }

    /** PUT /api/event-categories/{id} — Modifier une catégorie (ADMIN) */
    @PutMapping("/{id}")
    public ResponseEntity<EventCategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody EventCategoryRequest request,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    /** DELETE /api/event-categories/{id} — Supprimer une catégorie (ADMIN) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable Long id,
            @RequestParam Long userId) {

        if (!isAdmin(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Helper ───────────────────────────────────────────────────────

    private boolean isAdmin(Long userId) {
        com.elif.entities.user.User user = userService.findUser(userId);
        return user != null && user.getRole() == Role.ADMIN;
    }
}
