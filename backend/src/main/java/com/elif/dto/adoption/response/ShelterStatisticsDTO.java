package com.elif.dto.adoption.response;

public class ShelterStatisticsDTO {

    private Long shelterId;
    private String shelterName;
    private Long totalPets;
    private Long availablePets;
    private Long totalAdoptions;
    private Double adoptionRate;
    private Double averageRating;
    private Integer totalReviews;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

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

    public Long getTotalAdoptions() {
        return totalAdoptions;
    }

    public void setTotalAdoptions(Long totalAdoptions) {
        this.totalAdoptions = totalAdoptions;
    }

    public Double getAdoptionRate() {
        return adoptionRate;
    }

    public void setAdoptionRate(Double adoptionRate) {
        this.adoptionRate = adoptionRate;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Integer getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(Integer totalReviews) {
        this.totalReviews = totalReviews;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ShelterStatisticsDTO dto = new ShelterStatisticsDTO();

        public Builder shelterId(Long shelterId) {
            dto.setShelterId(shelterId);
            return this;
        }

        public Builder shelterName(String shelterName) {
            dto.setShelterName(shelterName);
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

        public Builder totalAdoptions(Long totalAdoptions) {
            dto.setTotalAdoptions(totalAdoptions);
            return this;
        }

        public Builder adoptionRate(Double adoptionRate) {
            dto.setAdoptionRate(adoptionRate);
            return this;
        }

        public Builder averageRating(Double averageRating) {
            dto.setAverageRating(averageRating);
            return this;
        }

        public Builder totalReviews(Integer totalReviews) {
            dto.setTotalReviews(totalReviews);
            return this;
        }

        public ShelterStatisticsDTO build() {
            return dto;
        }
    }
}