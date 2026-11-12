package com.elif.dto.pet_profile.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AdminPetBulkDeleteRequestDTO {

    @NotEmpty(message = "At least one pet id is required")
    @Size(max = 500, message = "You can delete up to 500 pets at once")
    private List<Long> petIds;
}
