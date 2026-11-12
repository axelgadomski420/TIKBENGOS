package com.elif.entities.service;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

import com.elif.entities.user.User;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "service")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private double price;
    private int duration; // en minutes
    private String status; // ACTIVE / INACTIVE
    private String imageUrl; // URL Cloudinary

    // --- REVIEWS / RATING ---
    @Builder.Default
    private Double rating = 0.0;
    
    @Builder.Default
    private Integer ratingCount = 0;

    @Column(columnDefinition = "TEXT")
    private String details; // JSON: category-specific attributes

    @ManyToOne
    @JoinColumn(name = "category_id")
    private ServiceCategory category;

    @ManyToOne
    @JoinColumn(name = "provider_id")
    private User provider; // le provider qui offre ce service

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<ServiceOption> options = new ArrayList<>();

    // --- VETERINARY ---
    private String clinicName;
    private String consultationType;
    private Boolean emergencyAvailable;
    private Boolean requiresAppointment;

    // --- GROOMING ---
    private String petSize;
    private Boolean includesBath;
    private Boolean includesHaircut;
    private String productsUsed;

    // --- TRAINING ---
    private String trainingType;
    private Integer sessionsCount;
    private Integer sessionDuration;
    private Boolean groupTraining;

    // --- BOARDING ---
    private Integer capacity;
    private Boolean overnight;
    private Boolean hasOutdoorSpace;
    private Integer maxStayDays;

    // --- HOTEL ---
    private String roomType;
    private Boolean hasCameraAccess;
    private Boolean includesFood;
    private Integer numberOfStaff;

    // --- WALKING ---
    private Integer durationPerWalk;
    private Boolean groupWalk;
    private Integer maxDogs;
    private String areaCovered;

    // ==================== MÉTHODES HELPER ====================
    public void addOption(ServiceOption option) {
        if (option != null) {
            this.options.add(option);
            option.setService(this);
        }
    }

    public void removeOption(ServiceOption option) {
        if (option != null) {
            this.options.remove(option);
            option.setService(null);
        }
    }
}