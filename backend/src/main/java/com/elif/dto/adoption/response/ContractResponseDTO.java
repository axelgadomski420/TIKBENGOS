package com.elif.dto.adoption.response;

import com.elif.entities.adoption.enums.ContractStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ContractResponseDTO {

    private Long id;
    private String numeroContrat;
    private Long shelterId;
    private String shelterName;
    private Long adoptantId;
    private String adoptantName;
    private Long animalId;
    private String animalName;
    private LocalDateTime dateSignature;
    private LocalDateTime dateAdoption;
    private ContractStatus statut;
    private String conditionsGenerales;
    private String conditionsSpecifiques;
    private BigDecimal fraisAdoption;
    private String documentUrl;
    private String temoinNom;
    private String temoinEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public String getShelterName() {
        return shelterName;
    }

    public void setShelterName(String shelterName) {
        this.shelterName = shelterName;
    }

    public Long getAdoptantId() {
        return adoptantId;
    }

    public void setAdoptantId(Long adoptantId) {
        this.adoptantId = adoptantId;
    }

    public String getAdoptantName() {
        return adoptantName;
    }

    public void setAdoptantName(String adoptantName) {
        this.adoptantName = adoptantName;
    }

    public Long getAnimalId() {
        return animalId;
    }

    public void setAnimalId(Long animalId) {
        this.animalId = animalId;
    }

    public String getAnimalName() {
        return animalName;
    }

    public void setAnimalName(String animalName) {
        this.animalName = animalName;
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
        private final ContractResponseDTO dto = new ContractResponseDTO();

        public Builder id(Long id) {
            dto.setId(id);
            return this;
        }

        public Builder numeroContrat(String numeroContrat) {
            dto.setNumeroContrat(numeroContrat);
            return this;
        }

        public Builder shelterId(Long shelterId) {
            dto.setShelterId(shelterId);
            return this;
        }

        public Builder shelterName(String shelterName) {
            dto.setShelterName(shelterName);
            return this;
        }

        public Builder adoptantId(Long adoptantId) {
            dto.setAdoptantId(adoptantId);
            return this;
        }

        public Builder adoptantName(String adoptantName) {
            dto.setAdoptantName(adoptantName);
            return this;
        }

        public Builder animalId(Long animalId) {
            dto.setAnimalId(animalId);
            return this;
        }

        public Builder animalName(String animalName) {
            dto.setAnimalName(animalName);
            return this;
        }

        public Builder dateSignature(LocalDateTime dateSignature) {
            dto.setDateSignature(dateSignature);
            return this;
        }

        public Builder dateAdoption(LocalDateTime dateAdoption) {
            dto.setDateAdoption(dateAdoption);
            return this;
        }

        public Builder statut(ContractStatus statut) {
            dto.setStatut(statut);
            return this;
        }

        public Builder conditionsGenerales(String conditionsGenerales) {
            dto.setConditionsGenerales(conditionsGenerales);
            return this;
        }

        public Builder conditionsSpecifiques(String conditionsSpecifiques) {
            dto.setConditionsSpecifiques(conditionsSpecifiques);
            return this;
        }

        public Builder fraisAdoption(BigDecimal fraisAdoption) {
            dto.setFraisAdoption(fraisAdoption);
            return this;
        }

        public Builder documentUrl(String documentUrl) {
            dto.setDocumentUrl(documentUrl);
            return this;
        }

        public Builder temoinNom(String temoinNom) {
            dto.setTemoinNom(temoinNom);
            return this;
        }

        public Builder temoinEmail(String temoinEmail) {
            dto.setTemoinEmail(temoinEmail);
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            dto.setCreatedAt(createdAt);
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            dto.setUpdatedAt(updatedAt);
            return this;
        }

        public ContractResponseDTO build() {
            return dto;
        }
    }
}