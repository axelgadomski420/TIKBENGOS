package com.elif.dto.pet_profile.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AdminPetBulkOperationResultDTO {
    private int requested;
    private int succeeded;
    private int failed;
    private List<String> errors;
}
