package com.elif.services.user;

import com.elif.dto.user.LoginRequest;
import com.elif.dto.user.RegisterRequest;
import com.elif.dto.user.UserResponse;
import com.elif.entities.user.User;

import java.util.List;

public interface IUserService {
    User addOrUpdateUser(User user);

    void deleteUser(Long idUser);

    List<User> findAllUsers();

    User findUser(Long idUser);

    UserResponse register(RegisterRequest request);

    UserResponse login(LoginRequest request);

    UserResponse loginWithGoogle(String idToken);

    List<User> getPendingShelters();

    UserResponse approveShelter(Long userId);

    void rejectShelter(Long userId);

    // AJOUTER CETTE MÉTHODE
    boolean existsByEmail(String email);

    // Password reset methods
    void initiatePasswordReset(String email);
    
    UserResponse resetPassword(String token, String newPassword, String confirmPassword);
}