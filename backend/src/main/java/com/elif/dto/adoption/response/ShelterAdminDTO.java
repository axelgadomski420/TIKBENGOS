package com.elif.dto.adoption.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ShelterAdminDTO {
    private Long id;
    private String name;
    private String address;
    private String phone;
    private String email;
    private String licenseNumber;
    private Boolean verified;
    private String description;
    private String logoUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long userId;
    private String userEmail;
    private Boolean userVerified;
}