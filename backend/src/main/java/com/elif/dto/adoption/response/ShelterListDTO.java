package com.elif.dto.adoption.response;

public class ShelterListDTO {

    private Long id;
    private String name;
    private String city;
    private Double averageRating;
    private Integer totalReviews;
    private String logoUrl;
    private Boolean verified;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
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

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public Boolean getVerified() {
        return verified;
    }

    public void setVerified(Boolean verified) {
        this.verified = verified;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ShelterListDTO dto = new ShelterListDTO();

        public Builder id(Long id) {
            dto.setId(id);
            return this;
        }

        public Builder name(String name) {
            dto.setName(name);
            return this;
        }

        public Builder city(String city) {
            dto.setCity(city);
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

        public Builder logoUrl(String logoUrl) {
            dto.setLogoUrl(logoUrl);
            return this;
        }

        public Builder verified(Boolean verified) {
            dto.setVerified(verified);
            return this;
        }

        public ShelterListDTO build() {
            return dto;
        }
    }
}