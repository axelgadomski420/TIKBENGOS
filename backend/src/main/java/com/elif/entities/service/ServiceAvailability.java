package com.elif.entities.service;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "service_availability")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceAvailability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;

    private boolean isAvailable;

    @ManyToOne
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;
}