package com.elif.dto.adoption.response;

import java.math.BigDecimal;
import java.util.Map;

public class AdoptionStatisticsDTO {

    private Long totalAdoptions;
    private Long totalPets;
    private Long availablePets;
    private Long pendingRequests;
    private BigDecimal totalRevenue;
    private Map<String, Long> adoptionsByPetType;
    private Map<String, Long> adoptionsByMonth;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getTotalAdoptions() {
        return totalAdoptions;
    }

    public void setTotalAdoptions(Long totalAdoptions) {
        this.totalAdoptions = totalAdoptions;
    }

    public Long getTotalPets() {
        return totalPets;
    }

    public void setTotalPets(Long totalPets) {
        this.totalPets = totalPets;
    }

    public Long getAvailablePets() {
        return availablePets;
    }

    public void setAvailablePets(Long availablePets) {
        this.availablePets = availablePets;
    }

    public Long getPendingRequests() {
        return pendingRequests;
    }

    public void setPendingRequests(Long pendingRequests) {
        this.pendingRequests = pendingRequests;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(BigDecimal totalRevenue) {
        this.totalRevenue = totalRevenue;
    }

    public Map<String, Long> getAdoptionsByPetType() {
        return adoptionsByPetType;
    }

    public void setAdoptionsByPetType(Map<String, Long> adoptionsByPetType) {
        this.adoptionsByPetType = adoptionsByPetType;
    }

    public Map<String, Long> getAdoptionsByMonth() {
        return adoptionsByMonth;
    }

    public void setAdoptionsByMonth(Map<String, Long> adoptionsByMonth) {
        this.adoptionsByMonth = adoptionsByMonth;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final AdoptionStatisticsDTO dto = new AdoptionStatisticsDTO();

        public Builder totalAdoptions(Long totalAdoptions) {
            dto.setTotalAdoptions(totalAdoptions);
            return this;
        }

        public Builder totalPets(Long totalPets) {
            dto.setTotalPets(totalPets);
            return this;
        }

        public Builder availablePets(Long availablePets) {
            dto.setAvailablePets(availablePets);
            return this;
        }

        public Builder pendingRequests(Long pendingRequests) {
            dto.setPendingRequests(pendingRequests);
            return this;
        }

        public Builder totalRevenue(BigDecimal totalRevenue) {
            dto.setTotalRevenue(totalRevenue);
            return this;
        }

        public Builder adoptionsByPetType(Map<String, Long> adoptionsByPetType) {
            dto.setAdoptionsByPetType(adoptionsByPetType);
            return this;
        }

        public Builder adoptionsByMonth(Map<String, Long> adoptionsByMonth) {
            dto.setAdoptionsByMonth(adoptionsByMonth);
            return this;
        }

        public AdoptionStatisticsDTO build() {
            return dto;
        }
    }
}