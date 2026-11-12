package com.elif.dto.adoption.request;

public class ShelterReviewRequestDTO {

    private Integer rating;
    private String comment;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

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

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ShelterReviewRequestDTO dto = new ShelterReviewRequestDTO();

        public Builder rating(Integer rating) {
            dto.setRating(rating);
            return this;
        }

        public Builder comment(String comment) {
            dto.setComment(comment);
            return this;
        }

        public ShelterReviewRequestDTO build() {
            return dto;
        }
    }
}