package com.elif.controllers.user;

import com.elif.dto.user.LoginRequest;
import com.elif.dto.user.RegisterRequest;
import com.elif.dto.user.ShelterRegisterRequest;
import com.elif.dto.user.UserResponse;
import com.elif.dto.user.ForgotPasswordRequest;
import com.elif.dto.user.ResetPasswordRequest;
import com.elif.dto.user.GoogleAuthRequest;
import com.elif.dto.user.PasswordResetResponse;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.entities.adoption.Shelter;
import com.elif.services.adoption.interfaces.ShelterService;  // ← CORRIGÉ : ajouter interfaces
import com.elif.services.user.IUserService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/user")
@AllArgsConstructor
public class UserController {

    final IUserService userService;
    final ShelterService shelterService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(userService.register(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register-shelter")
    ResponseEntity<?> registerShelter(@RequestBody ShelterRegisterRequest request) {
        try {
            // 1. Vérifier si l'email existe déjà dans user
            if (userService.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email already in use"));
            }

            // 2. Vérifier si l'email existe déjà dans shelter
            if (shelterService.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Shelter with this email already exists"));
            }

            // 3. Créer l'utilisateur
            User user = User.builder()
                    .firstName(request.getOrganizationName())
                    .lastName("")
                    .email(request.getEmail())
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .role(Role.SHELTER)
                    .verified(false)
                    .build();
            user = userService.addOrUpdateUser(user);

            // 4. Créer le shelter associé
            Shelter shelter = Shelter.builder()
                    .name(request.getOrganizationName())
                    .address(request.getAddress())
                    .phone(request.getPhone())
                    .email(request.getEmail())
                    .licenseNumber(request.getLicenseNumber())
                    .description(request.getDescription())
                    .logoUrl(request.getLogoUrl())
                    .user(user)
                    .verified(false)
                    .build();
            shelter = shelterService.create(shelter);

            return ResponseEntity.ok(Map.of(
                    "message", "Shelter registration submitted for approval",
                    "shelterId", shelter.getId(),
                    "userId", user.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(userService.login(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/google-auth")
    ResponseEntity<?> googleAuth(@RequestBody GoogleAuthRequest request) {
        try {
            return ResponseEntity.ok(userService.loginWithGoogle(request.getIdToken()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/add")
    User addUser(@RequestBody User user) {
        return userService.addOrUpdateUser(user);
    }

    @PutMapping("/update")
    User updateUser(@RequestBody User user) {
        return userService.addOrUpdateUser(user);
    }

    @DeleteMapping("/delete")
    void deleteUser(@RequestParam Long id) {
        userService.deleteUser(id);
    }

    @GetMapping("/findAll")
    List<User> getAllUsers() {
        return userService.findAllUsers();
    }

    @GetMapping("/findById/{idUser}")
    User findByIdUser(@PathVariable Long idUser) {
        return userService.findUser(idUser);
    }

    // ============================================================
    // ADMIN ENDPOINTS - GESTION DES REFUGES EN ATTENTE
    // ============================================================

    @GetMapping("/admin/pending-shelters")
    public ResponseEntity<List<UserResponse>> getPendingShelters() {
        List<User> shelters = userService.getPendingShelters();
        List<UserResponse> response = shelters.stream()
                .map(u -> new UserResponse(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getRole().name(), u.getVerified()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/admin/approve-shelter/{userId}")
    public ResponseEntity<UserResponse> approveShelter(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.approveShelter(userId));
    }

    @DeleteMapping("/admin/reject-shelter/{userId}")
    public ResponseEntity<Void> rejectShelter(@PathVariable Long userId) {
        userService.rejectShelter(userId);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // PASSWORD RESET ENDPOINTS
    // ============================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            userService.initiatePasswordReset(request.getEmail());
            return ResponseEntity.ok(new PasswordResetResponse(true, "If this email exists in our system, a password reset link has been sent."));
        } catch (IllegalArgumentException e) {
            // Return same message for security reasons - don't reveal if email exists
            return ResponseEntity.ok(new PasswordResetResponse(true, "If this email exists in our system, a password reset link has been sent."));
        } catch (Exception e) {
            // Log the actual error for debugging
            System.err.println("ERROR sending password reset email: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(new PasswordResetResponse(true, "If this email exists in our system, a password reset link has been sent."));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            UserResponse userResponse = userService.resetPassword(request.getToken(), request.getNewPassword(), request.getConfirmPassword());
            return ResponseEntity.ok(new PasswordResetResponse(true, "Password has been reset successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new PasswordResetResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new PasswordResetResponse(false, "An error occurred while resetting password."));
        }
    }
}