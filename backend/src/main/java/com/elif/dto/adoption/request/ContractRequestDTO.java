package com.elif.dto.adoption.request;

import java.math.BigDecimal;

public class ContractRequestDTO {

    private Long shelterId;
    private Long adoptantId;
    private Long animalId;
    private BigDecimal fraisAdoption;
    private String conditionsSpecifiques;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getShelterId() {
        return shelterId;
    }

    public void setShelterId(Long shelterId) {
        this.shelterId = shelterId;
    }

    public Long getAdoptantId() {
        return adoptantId;
    }

    public void setAdoptantId(Long adoptantId) {
        this.adoptantId = adoptantId;
    }

    public Long getAnimalId() {
        return animalId;
    }

    public void setAnimalId(Long animalId) {
        this.animalId = animalId;
    }

    public BigDecimal getFraisAdoption() {
        return fraisAdoption;
    }

    public void setFraisAdoption(BigDecimal fraisAdoption) {
        this.fraisAdoption = fraisAdoption;
    }

    public String getConditionsSpecifiques() {
        return conditionsSpecifiques;
    }

    public void setConditionsSpecifiques(String conditionsSpecifiques) {
        this.conditionsSpecifiques = conditionsSpecifiques;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ContractRequestDTO dto = new ContractRequestDTO();

        public Builder shelterId(Long shelterId) {
            dto.setShelterId(shelterId);
            return this;
        }

        public Builder adoptantId(Long adoptantId) {
            dto.setAdoptantId(adoptantId);
            return this;
        }

        public Builder animalId(Long animalId) {
            dto.setAnimalId(animalId);
            return this;
        }

        public Builder fraisAdoption(BigDecimal fraisAdoption) {
            dto.setFraisAdoption(fraisAdoption);
            return this;
        }

        public Builder conditionsSpecifiques(String conditionsSpecifiques) {
            dto.setConditionsSpecifiques(conditionsSpecifiques);
            return this;
        }

        public ContractRequestDTO build() {
            return dto;
        }
    }
}