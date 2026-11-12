package com.elif.dto.adoption.request;

public class ShelterRequestDTO {

    private String name;
    private String address;
    private String phone;
    private String email;
    private String licenseNumber;
    private String description;
    private String logoUrl;

    // ============================================================
    // GETTERS ET SETTERS
    // ============================================================

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    // ============================================================
    // BUILDER MANUEL
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final ShelterRequestDTO dto = new ShelterRequestDTO();

        public Builder name(String name) {
            dto.setName(name);
            return this;
        }

        public Builder address(String address) {
            dto.setAddress(address);
            return this;
        }

        public Builder phone(String phone) {
            dto.setPhone(phone);
            return this;
        }

        public Builder email(String email) {
            dto.setEmail(email);
            return this;
        }

        public Builder licenseNumber(String licenseNumber) {
            dto.setLicenseNumber(licenseNumber);
            return this;
        }

        public Builder description(String description) {
            dto.setDescription(description);
            return this;
        }

        public Builder logoUrl(String logoUrl) {
            dto.setLogoUrl(logoUrl);
            return this;
        }

        public ShelterRequestDTO build() {
            return dto;
        }
    }
}