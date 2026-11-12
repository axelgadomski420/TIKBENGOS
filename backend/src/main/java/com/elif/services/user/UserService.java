package com.elif.services.user;

import com.elif.dto.user.GoogleUserPrincipal;
import com.elif.dto.user.LoginRequest;
import com.elif.dto.user.RegisterRequest;
import com.elif.dto.user.UserResponse;
import com.elif.entities.adoption.Shelter;
import com.elif.entities.user.AuthProvider;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.entities.user.PasswordReset;
import com.elif.services.auth.GoogleIdTokenService;
import com.elif.repositories.adoption.ShelterRepository;
import com.elif.repositories.user.UserRepository;
import com.elif.repositories.user.PasswordResetRepository;
import com.elif.services.email.EmailService;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
@Slf4j
public class UserService implements IUserService {

    final UserRepository userRepository;
    final ShelterRepository shelterRepository;
    final PasswordResetRepository passwordResetRepository;
    final EmailService emailService;
    final GoogleIdTokenService googleIdTokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public User addOrUpdateUser(User user) {
        return userRepository.save(user);
    }

    @Override
    public void deleteUser(Long idUser) {
        userRepository.deleteById(idUser);
    }

    @Override
    public List<User> findAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public User findUser(Long idUser) {
        return userRepository.findById(idUser).orElse(null);
    }

    @Override
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }

        Role role;
        boolean verified;

        if ("SHELTER".equals(request.getAccountType())) {
            role = Role.SHELTER;
            verified = false;
        } else {
            role = Role.USER;
            verified = true;
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .verified(verified)
                .build();

        user = userRepository.save(user);

        // Si c'est un shelter, créer l'entrée dans la table shelter
        if ("SHELTER".equals(request.getAccountType())) {
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
            shelterRepository.save(shelter);
        }

        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name(), user.getVerified());
    }

    @Override
    public UserResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name(), user.getVerified());
    }

    @Override
    public UserResponse loginWithGoogle(String idToken) {
        GoogleUserPrincipal principal = googleIdTokenService.verify(idToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired Google sign-in"));

        if (!principal.emailVerified()) {
            throw new IllegalArgumentException("Your Google account email must be verified");
        }

        Optional<User> bySub = userRepository.findByGoogleSub(principal.sub());
        if (bySub.isPresent()) {
            User u = bySub.get();
            return new UserResponse(u.getId(), u.getFirstName(), u.getLastName(),
                    u.getEmail(), u.getRole().name(), u.getVerified());
        }

        Optional<User> byEmail = userRepository.findByEmail(principal.email());
        if (byEmail.isPresent()) {
            User u = byEmail.get();
            if (u.getRole() != Role.USER) {
                throw new IllegalArgumentException(
                        "This email belongs to a shelter or staff account. Please sign in with your email and password.");
            }
            if (u.getGoogleSub() != null && !u.getGoogleSub().equals(principal.sub())) {
                throw new IllegalArgumentException("This email is already linked to a different Google account.");
            }
            u.setGoogleSub(principal.sub());
            u = userRepository.save(u);
            return new UserResponse(u.getId(), u.getFirstName(), u.getLastName(),
                    u.getEmail(), u.getRole().name(), u.getVerified());
        }

        String first = principal.givenName();
        if (first == null || first.isBlank()) {
            first = "Member";
        }
        String last = principal.familyName() != null ? principal.familyName() : "";

        User user = User.builder()
                .firstName(first)
                .lastName(last)
                .email(principal.email())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .authProvider(AuthProvider.GOOGLE)
                .googleSub(principal.sub())
                .role(Role.USER)
                .verified(true)
                .build();
        user = userRepository.save(user);
        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name(), user.getVerified());
    }

    // ============================================================
    // GESTION DES REFUGES
    // ============================================================

    @Override
    public List<User> getPendingShelters() {
        return userRepository.findByRoleAndVerified(Role.SHELTER, false);
    }

    @Override
    public UserResponse approveShelter(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() != Role.SHELTER) {
            throw new IllegalArgumentException("User is not a shelter");
        }

        // Mettre à jour l'utilisateur (si pas déjà vérifié)
        if (!user.getVerified()) {
            user.setVerified(true);
            user = userRepository.save(user);
        }

        // Mettre à jour le shelter associé
        Shelter shelter = shelterRepository.findByUserId(userId).orElse(null);
        if (shelter != null && !shelter.getVerified()) {
            shelter.setVerified(true);
            shelterRepository.save(shelter);
        }

        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name(), user.getVerified());
    }

    @Override
    public void rejectShelter(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() != Role.SHELTER) {
            throw new IllegalArgumentException("User is not a shelter");
        }

        // Supprimer le shelter associé
        Shelter shelter = shelterRepository.findByUserId(userId).orElse(null);
        if (shelter != null) {
            shelterRepository.delete(shelter);
        }

        userRepository.delete(user);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    // ============================================================
    // PASSWORD RESET METHODS
    // ============================================================

    @Override
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("Password reset requested for unknown email={}", email);
            throw new IllegalArgumentException("User not found with this email");
        }

        // Invalid any existing reset tokens for this user
        passwordResetRepository.findByUserAndUsedFalse(user)
                .ifPresent(pr -> {
                    pr.setUsed(true);
                    pr.setUsedAt(LocalDateTime.now());
                    passwordResetRepository.save(pr);
                });

        // Create new reset token
        String resetToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(1);

        PasswordReset passwordReset = PasswordReset.builder()
                .user(user)
                .resetToken(resetToken)
                .expiresAt(expiresAt)
                .used(false)
                .build();

        passwordResetRepository.save(passwordReset);

        // Send email with reset link
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), resetToken, user.getFirstName());
        } catch (Exception e) {
            log.error("Password reset email failed for userId={} email={}", user.getId(), user.getEmail(), e);
            throw new RuntimeException("Failed to send password reset email.");
        }
    }

    @Override
    public UserResponse resetPassword(String token, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        PasswordReset passwordReset = passwordResetRepository.findByResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));

        // Check if token is expired
        if (LocalDateTime.now().isAfter(passwordReset.getExpiresAt())) {
            throw new IllegalArgumentException("Reset token has expired");
        }

        // Check if token has already been used
        if (passwordReset.getUsed()) {
            throw new IllegalArgumentException("Reset token has already been used");
        }

        // Update user password
        User user = passwordReset.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        passwordReset.setUsed(true);
        passwordReset.setUsedAt(LocalDateTime.now());
        passwordResetRepository.save(passwordReset);

        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(),
                user.getEmail(), user.getRole().name(), user.getVerified());
    }
}