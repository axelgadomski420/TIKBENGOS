package com.elif.entities.service;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "service_option")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // ex: Premium, Food spécial, VIP room
    private double price;

   
    @ManyToOne
@JoinColumn(name = "service_id")
@JsonBackReference
private Service service;
}