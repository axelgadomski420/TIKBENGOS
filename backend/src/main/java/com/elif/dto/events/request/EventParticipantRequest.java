package com.elif.dto.events.request;

import com.elif.services.events.implementations.EventEligibilityService.PetRegistrationData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventParticipantRequest {

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "You must reserve at least 1 seat")
    @Max(value = 20, message = "You cannot reserve more than 20 seats at once")
    @Builder.Default
    private Integer numberOfSeats = 1;

    /**
     * Données d'un seul animal (pour compatibilité)
     */
    @Valid
    private PetRegistrationData petData;

    /**
     * ✅ Liste d'animaux pour les compétitions
     * Un participant peut inscrire plusieurs animaux
     */
    @Valid
    @Builder.Default
    private List<PetRegistrationData> pets = new ArrayList<>();
}