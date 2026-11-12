package com.elif.repositories.user;

import com.elif.entities.user.PasswordReset;
import com.elif.entities.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {
    Optional<PasswordReset> findByResetToken(String resetToken);
    
    Optional<PasswordReset> findByUserAndUsedFalse(User user);
}
