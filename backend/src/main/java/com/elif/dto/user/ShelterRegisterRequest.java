package com.elif.dto.user;

import lombok.Data;

@Data
public class ShelterRegisterRequest {
    private String email;
    private String password;
    private String organizationName;
    private String address;
    private String phone;
    private String licenseNumber;
    private String description;
    private String logoUrl;
}