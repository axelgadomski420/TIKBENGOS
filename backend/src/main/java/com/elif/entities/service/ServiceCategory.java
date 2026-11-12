package com.elif.entities.service;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "service_category")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name; // HOTEL, DRESSAGE, GROOMING...

    private String description;
}