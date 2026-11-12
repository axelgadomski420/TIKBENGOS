package com.elif.entities.service;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.Set;
import com.elif.entities.user.User;

@Entity
@Table(name = "service_booking")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    // Informations sur le pet stockées directement
    private String petName;
    private String petType;
    private String petBreed;
    private int petAge;

    @ManyToOne
    private Service service;

    @ManyToMany
    @JoinTable(
        name = "booking_options",
        joinColumns = @JoinColumn(name = "booking_id"),
        inverseJoinColumns = @JoinColumn(name = "option_id")
    )
    private Set<ServiceOption> selectedOptions;

    @ManyToOne
    private ServiceAvailability availability; // le créneau réservé

    private LocalDateTime bookingDate;
    private String status; // PENDING / CONFIRMED / CANCELLED
    private double totalPrice; // prix total du service + options
}