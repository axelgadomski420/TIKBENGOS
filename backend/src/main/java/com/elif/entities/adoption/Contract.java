package com.elif.entities.adoption;

import com.elif.entities.adoption.enums.ContractStatus;
import com.elif.entities.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_contrat", unique = true, nullable = false, length = 50)
    private String numeroContrat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refuge_id", nullable = false)
    @JsonIgnore
    private Shelter shelter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adoptant_id", nullable = false)
    private User adoptant;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id", nullable = false)
    @JsonIgnore
    private AdoptionPet animal;

    @Column(name = "date_signature")
    private LocalDateTime dateSignature;

    @Column(name = "date_adoption")
    private LocalDateTime dateAdoption = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContractStatus statut = ContractStatus.BROUILLON;

    @Column(name = "conditions_generales", columnDefinition = "TEXT")
    private String conditionsGenerales;

    @Column(name = "conditions_specifiques", columnDefinition = "TEXT")
    private String conditionsSpecifiques;

    @Column(name = "frais_adoption", precision = 10, scale = 2)
    private BigDecimal fraisAdoption = BigDecimal.ZERO;

    @Column(name = "document_url", length = 500)
    private String documentUrl;

    @Column(name = "temoin_nom", length = 255)
    private String temoinNom;

    @Column(name = "temoin_email", length = 255)
    private String temoinEmail;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ============================================================
    // CONSTRUCTEURS
    // ============================================================

    public Contract() {
    }

    public Contract(Long id, String numeroContrat, Shelter shelter, User adoptant, AdoptionPet animal,
                    LocalDateTime dateSignature, LocalDateTime dateAdoption, ContractStatus statut,
                    String conditionsGenerales, String conditionsSpecifiques, BigDecimal fraisAdoption,
                    String documentUrl, String temoinNom, String temoinEmail,
                    LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.numeroContrat = numeroContrat;
        this.shelter = shelter;
        this.adoptant = adoptant;
        this.animal = animal;
        this.dateSignature = dateSignature;
        this.dateAdoption = dateAdoption;
        this.statut = statut;
        this.conditionsGenerales = conditionsGenerales;
        this.conditionsSpecifiques = conditionsSpecifiques;
        this.fraisAdoption = fraisAdoption;
        this.documentUrl = documentUrl;
        this.temoinNom = temoinNom;
        this.temoinEmail = temoinEmail;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumeroContrat() {
        return numeroContrat;
    }

    public void setNumeroContrat(String numeroContrat) {
        this.numeroContrat = numeroContrat;
    }

    public Shelter getShelter() {
        return shelter;
    }

    public void setShelter(Shelter shelter) {
        this.shelter = shelter;
    }

    public User getAdoptant() {
        return adoptant;
    }

    public void setAdoptant(User adoptant) {
        this.adoptant = adoptant;
    }

    public AdoptionPet getAnimal() {
        return animal;
    }

    public void setAnimal(AdoptionPet animal) {
        this.animal = animal;
    }

    public LocalDateTime getDateSignature() {
        return dateSignature;
    }

    public void setDateSignature(LocalDateTime dateSignature) {
        this.dateSignature = dateSignature;
    }

    public LocalDateTime getDateAdoption() {
        return dateAdoption;
    }

    public void setDateAdoption(LocalDateTime dateAdoption) {
        this.dateAdoption = dateAdoption;
    }

    public ContractStatus getStatut() {
        return statut;
    }

    public void setStatut(ContractStatus statut) {
        this.statut = statut;
    }

    public String getConditionsGenerales() {
        return conditionsGenerales;
    }

    public void setConditionsGenerales(String conditionsGenerales) {
        this.conditionsGenerales = conditionsGenerales;
    }

    public String getConditionsSpecifiques() {
        return conditionsSpecifiques;
    }

    public void setConditionsSpecifiques(String conditionsSpecifiques) {
        this.conditionsSpecifiques = conditionsSpecifiques;
    }

    public BigDecimal getFraisAdoption() {
        return fraisAdoption;
    }

    public void setFraisAdoption(BigDecimal fraisAdoption) {
        this.fraisAdoption = fraisAdoption;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public void setDocumentUrl(String documentUrl) {
        this.documentUrl = documentUrl;
    }

    public String getTemoinNom() {
        return temoinNom;
    }

    public void setTemoinNom(String temoinNom) {
        this.temoinNom = temoinNom;
    }

    public String getTemoinEmail() {
        return temoinEmail;
    }

    public void setTemoinEmail(String temoinEmail) {
        this.temoinEmail = temoinEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String numeroContrat;
        private Shelter shelter;
        private User adoptant;
        private AdoptionPet animal;
        private LocalDateTime dateSignature;
        private LocalDateTime dateAdoption = LocalDateTime.now();
        private ContractStatus statut = ContractStatus.BROUILLON;
        private String conditionsGenerales;
        private String conditionsSpecifiques;
        private BigDecimal fraisAdoption = BigDecimal.ZERO;
        private String documentUrl;
        private String temoinNom;
        private String temoinEmail;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder numeroContrat(String numeroContrat) {
            this.numeroContrat = numeroContrat;
            return this;
        }

        public Builder shelter(Shelter shelter) {
            this.shelter = shelter;
            return this;
        }

        public Builder adoptant(User adoptant) {
            this.adoptant = adoptant;
            return this;
        }

        public Builder animal(AdoptionPet animal) {
            this.animal = animal;
            return this;
        }

        public Builder dateSignature(LocalDateTime dateSignature) {
            this.dateSignature = dateSignature;
            return this;
        }

        public Builder dateAdoption(LocalDateTime dateAdoption) {
            this.dateAdoption = dateAdoption;
            return this;
        }

        public Builder statut(ContractStatus statut) {
            this.statut = statut;
            return this;
        }

        public Builder conditionsGenerales(String conditionsGenerales) {
            this.conditionsGenerales = conditionsGenerales;
            return this;
        }

        public Builder conditionsSpecifiques(String conditionsSpecifiques) {
            this.conditionsSpecifiques = conditionsSpecifiques;
            return this;
        }

        public Builder fraisAdoption(BigDecimal fraisAdoption) {
            this.fraisAdoption = fraisAdoption;
            return this;
        }

        public Builder documentUrl(String documentUrl) {
            this.documentUrl = documentUrl;
            return this;
        }

        public Builder temoinNom(String temoinNom) {
            this.temoinNom = temoinNom;
            return this;
        }

        public Builder temoinEmail(String temoinEmail) {
            this.temoinEmail = temoinEmail;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Contract build() {
            return new Contract(id, numeroContrat, shelter, adoptant, animal,
                    dateSignature, dateAdoption, statut,
                    conditionsGenerales, conditionsSpecifiques, fraisAdoption,
                    documentUrl, temoinNom, temoinEmail,
                    createdAt, updatedAt);
        }
    }
}