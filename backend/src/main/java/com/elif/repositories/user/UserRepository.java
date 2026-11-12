package com.elif.repositories.user;

import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleSub(String googleSub);

    @Query(value = "SELECT * FROM `user` u WHERE LOWER(SUBSTRING_INDEX(u.email, '@', 1)) = LOWER(:handle) LIMIT 1", nativeQuery = true)
    Optional<User> findByEmailLocalPart(@Param("handle") String handle);

    boolean existsByEmail(String email);

    // Récupérer les utilisateurs par rôle et statut de vérification
    List<User> findByRoleAndVerified(Role role, Boolean verified);

    /**
     * Compter le nombre d'utilisateurs par rôle
     */
    long countByRole(Role role);

    /**
     * Compter le nombre d'utilisateurs par rôle et statut de vérification
     */
    long countByRoleAndVerified(Role role, Boolean verified);
}