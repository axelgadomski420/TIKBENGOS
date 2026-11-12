package com.elif.dto.user;

import lombok.Data;

@Data
public class RegisterRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String accountType;

    // Champs pour shelter
    private String organizationName;
    private String address;
    private String phone;
    private String licenseNumber;
    private String description;
    private String logoUrl;
}