package com.elif.dto.adoption.response;

import java.time.LocalDateTime;

public class ShelterReviewResponseDTO {

    private Long id;
    private Long shelterId;
    private String shelterName;
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    private Boolean isApproved;
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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Boolean getIsApproved() {
        return isApproved;
    }

    public void setIsApproved(Boolean isApproved) {
        this.isApproved = isApproved;
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
        private final ShelterReviewResponseDTO dto = new ShelterReviewResponseDTO();

        public Builder id(Long id) {
            dto.setId(id);
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

        public Builder userId(Long userId) {
            dto.setUserId(userId);
            return this;
        }

        public Builder userName(String userName) {
            dto.setUserName(userName);
            return this;
        }

        public Builder rating(Integer rating) {
            dto.setRating(rating);
            return this;
        }

        public Builder comment(String comment) {
            dto.setComment(comment);
            return this;
        }

        public Builder isApproved(Boolean isApproved) {
            dto.setIsApproved(isApproved);
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

        public ShelterReviewResponseDTO build() {
            return dto;
        }
    }
}