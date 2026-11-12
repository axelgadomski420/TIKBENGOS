package com.elif.services.pet_profile.interfaces;

import com.elif.dto.pet_profile.request.PetProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetHealthRecordRequestDTO;
import com.elif.dto.pet_profile.request.PetCareTaskRequestDTO;
import com.elif.dto.pet_profile.request.PetFeedingLogRequestDTO;
import com.elif.dto.pet_profile.request.PetNutritionProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetLocationUpdateRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkDeleteRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkUpdateRequestDTO;
import com.elif.dto.pet_profile.request.PetWaterLogRequestDTO;
import com.elif.dto.pet_profile.request.PetWeightLogRequestDTO;
import com.elif.dto.pet_profile.response.PetCalorieSuggestionResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterLogResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterSummaryResponseDTO;
import com.elif.dto.pet_profile.response.PetWeightLogResponseDTO;
import com.elif.entities.pet_profile.PetWaterLog;
import com.elif.entities.pet_profile.PetWeightLog;
import com.elif.dto.pet_profile.response.AdminPetBulkOperationResultDTO;
import com.elif.dto.pet_profile.response.AdminPetDashboardStatsDTO;
import com.elif.dto.pet_profile.response.PetNutritionInsightsResponseDTO;
import com.elif.dto.pet_profile.response.PetNutritionSummaryResponseDTO;
import com.elif.entities.pet_profile.PetCareTask;
import com.elif.entities.pet_profile.PetFeedingLog;
import com.elif.entities.pet_profile.PetHealthRecord;
import com.elif.entities.pet_profile.PetNutritionProfile;
import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import com.elif.entities.pet_profile.enums.PetSpecies;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public interface PetProfileService {
    List<PetProfile> findMyPets(Long userId, PetSpecies species);
    PetProfile findMyPetById(Long userId, Long petId);
    PetProfile createMyPet(Long userId, PetProfileRequestDTO request);
    PetProfile updateMyPet(Long userId, Long petId, PetProfileRequestDTO request);
    PetProfile updateMyPetLocation(Long userId, Long petId, PetLocationUpdateRequestDTO request);
    PetProfile uploadMyPetPhoto(Long userId, Long petId, MultipartFile file);
    void deleteMyPet(Long userId, Long petId);
    List<PetHealthRecord> findMyPetHealthHistory(Long userId, Long petId);
    PetHealthRecord createMyPetHealthRecord(Long userId, Long petId, PetHealthRecordRequestDTO request);
    PetHealthRecord updateMyPetHealthRecord(Long userId, Long petId, Long recordId, PetHealthRecordRequestDTO request);
    void deleteMyPetHealthRecord(Long userId, Long petId, Long recordId);
    List<PetCareTask> findMyPetTasks(Long userId, Long petId);
    PetCareTask createMyPetTask(Long userId, Long petId, PetCareTaskRequestDTO request);
    PetCareTask updateMyPetTask(Long userId, Long petId, Long taskId, PetCareTaskRequestDTO request);
    void deleteMyPetTask(Long userId, Long petId, Long taskId);

    PetNutritionProfile getMyPetNutritionProfile(Long userId, Long petId);
    PetNutritionProfile upsertMyPetNutritionProfile(Long userId, Long petId, PetNutritionProfileRequestDTO request);
    List<PetFeedingLog> getMyPetFeedingLogs(Long userId, Long petId);
    List<PetFeedingLog> getMyPetFeedingLogs(Long userId, Long petId, LocalDate fromDate, LocalDate toDate);
    PetFeedingLog createMyPetFeedingLog(Long userId, Long petId, PetFeedingLogRequestDTO request);
    PetFeedingLog updateMyPetFeedingLog(Long userId, Long petId, Long logId, PetFeedingLogRequestDTO request);
    void deleteMyPetFeedingLog(Long userId, Long petId, Long logId);
    PetNutritionSummaryResponseDTO getMyPetNutritionSummary(Long userId, Long petId);
    PetNutritionInsightsResponseDTO getMyPetNutritionInsights(Long userId, Long petId, Integer days);
    PetCalorieSuggestionResponseDTO suggestCaloriesForPet(Long userId, Long petId, PetActivityLevel activityLevel, PetNutritionGoal goal);

    // Weight log
    List<PetWeightLogResponseDTO> getMyPetWeightLogs(Long userId, Long petId);
    PetWeightLog createMyPetWeightLog(Long userId, Long petId, PetWeightLogRequestDTO request);
    void deleteMyPetWeightLog(Long userId, Long petId, Long logId);

    // Water log
    List<PetWaterLog> getMyPetWaterLogs(Long userId, Long petId, LocalDate date);
    PetWaterLog createMyPetWaterLog(Long userId, Long petId, PetWaterLogRequestDTO request);
    void deleteMyPetWaterLog(Long userId, Long petId, Long logId);
    PetWaterSummaryResponseDTO getMyPetWaterSummary(Long userId, Long petId);

    List<PetProfile> findAllPetsForAdmin(Long adminUserId, PetSpecies species);
    PetProfile updatePetAsAdmin(Long adminUserId, Long petId, PetProfileRequestDTO request);
    PetProfile uploadPetPhotoAsAdmin(Long adminUserId, Long petId, MultipartFile file);
    void deletePetAsAdmin(Long adminUserId, Long petId);
    AdminPetBulkOperationResultDTO bulkUpdatePetsAsAdmin(Long adminUserId, AdminPetBulkUpdateRequestDTO request);
    AdminPetBulkOperationResultDTO bulkDeletePetsAsAdmin(Long adminUserId, AdminPetBulkDeleteRequestDTO request);
    AdminPetDashboardStatsDTO getAdminPetDashboardStats(Long adminUserId);
}
