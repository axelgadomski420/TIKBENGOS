package com.elif.dto.events.request;

import com.elif.entities.events.EventStatus;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {

    @NotBlank(message = "Le titre de l'événement est obligatoire")
    @Size(max = 150, message = "Le titre ne peut dépasser 150 caractères")
    private String title;

    @Size(max = 2000, message = "La description ne peut dépasser 2000 caractères")
    private String description;

    @NotBlank(message = "Le lieu est obligatoire")
    @Size(max = 200, message = "Le lieu ne peut dépasser 200 caractères")
    private String location;

    @NotNull(message = "La date de début est obligatoire")
    @Future(message = "La date de début doit être dans le futur")
    private LocalDateTime startDate;

    @NotNull(message = "La date de fin est obligatoire")
    @Future(message = "La date de fin doit être dans le futur")
    private LocalDateTime endDate;

    @NotNull(message = "Le nombre maximal de participants est obligatoire")
    private Integer maxParticipants;

    private Long categoryId;   // ID de la catégorie
    private String imageUrl;
    private String coverImageUrl;// optionnel
}