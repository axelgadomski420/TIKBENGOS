package com.elif.repositories.pet_profile;

import com.elif.entities.pet_profile.PetFoodItem;
import com.elif.entities.pet_profile.enums.PetSpecies;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PetFoodItemRepository extends JpaRepository<PetFoodItem, Long> {
    List<PetFoodItem> findByIsSystemFoodTrue();
    List<PetFoodItem> findByUserId(Long userId);
    
    @Query("select f from PetFoodItem f where f.isSystemFood = true or f.userId = :userId")
    List<PetFoodItem> findAvailableForUser(Long userId);
    
    @Query("select f from PetFoodItem f where (f.isSystemFood = true or f.userId = :userId) and (f.species = :species or f.species is null)")
    List<PetFoodItem> findByUserIdAndSpecies(Long userId, PetSpecies species);
    
    @Query("select f from PetFoodItem f where (f.isSystemFood = true or f.userId = :userId) and lower(f.name) like lower(concat('%', :query, '%'))")
    List<PetFoodItem> searchByName(Long userId, String query);
}
