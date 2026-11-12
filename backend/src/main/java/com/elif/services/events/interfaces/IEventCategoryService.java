package com.elif.services.events.interfaces;

import com.elif.dto.events.request.EventCategoryRequest;
import com.elif.dto.events.response.EventCategoryResponse;

import java.util.List;

public interface IEventCategoryService {

    /** Lister toutes les catégories */
    List<EventCategoryResponse> getAllCategories();

    /** Détail d'une catégorie */
    EventCategoryResponse getCategoryById(Long id);

    /** Créer une catégorie (admin uniquement) */
    EventCategoryResponse createCategory(EventCategoryRequest request);

    /** Modifier une catégorie (admin uniquement) */
    EventCategoryResponse updateCategory(Long id, EventCategoryRequest request);

    /** Supprimer une catégorie si aucun événement ne l'utilise */
    void deleteCategory(Long id);
}