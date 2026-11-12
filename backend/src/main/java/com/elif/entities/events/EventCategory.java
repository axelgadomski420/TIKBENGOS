package com.elif.entities.events;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "event_category")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "events")
@EqualsAndHashCode(exclude = "events")
public class EventCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 10)
    private String icon;

    @Column(length = 255)
    private String description;

    /**
     * ✅ Si true, les inscriptions à cette catégorie passent en PENDING
     * et doivent être approuvées par l'admin.
     * Utilisé pour : Concours, Compétition, etc.
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean requiresApproval = false;

    /**
     * ✅ NOUVEAU : Si true, cette catégorie est une compétition
     * et doit avoir des règles d'éligibilité définies.
     * Utilisé pour : Concours canins, compétitions, etc.
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean competitionMode = false;

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Event> events;
}