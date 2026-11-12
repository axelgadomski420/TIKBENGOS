package com.elif.controllers.pet_profile;

import com.elif.dto.pet_profile.request.PetProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetHealthRecordRequestDTO;
import com.elif.dto.pet_profile.request.PetCareTaskRequestDTO;
import com.elif.dto.pet_profile.request.PetFeedingLogRequestDTO;
import com.elif.dto.pet_profile.request.PetNutritionProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetLocationUpdateRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkDeleteRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkUpdateRequestDTO;
import com.elif.dto.pet_profile.response.PetAIProfileWizardResponseDTO;
import com.elif.dto.pet_profile.response.AdminPetDashboardStatsDTO;
import com.elif.dto.pet_profile.response.AdminPetBulkOperationResultDTO;
import com.elif.dto.pet_profile.response.PetCareTaskResponseDTO;
import com.elif.entities.pet_profile.PetCareTask;
import com.elif.dto.pet_profile.response.PetFeedingLogResponseDTO;
import com.elif.dto.pet_profile.response.PetHealthRecordResponseDTO;
import com.elif.entities.pet_profile.PetHealthRecord;
import com.elif.dto.pet_profile.response.PetNutritionInsightsResponseDTO;
import com.elif.dto.pet_profile.response.PetNutritionProfileResponseDTO;
import com.elif.dto.pet_profile.response.PetNutritionSummaryResponseDTO;
import com.elif.dto.pet_profile.response.PetProfileResponseDTO;
import com.elif.entities.pet_profile.PetFeedingLog;
import com.elif.entities.pet_profile.PetNutritionProfile;
import com.elif.entities.pet_profile.PetProfile;
import com.elif.dto.pet_profile.request.PetWaterLogRequestDTO;
import com.elif.dto.pet_profile.request.PetWeightLogRequestDTO;
import com.elif.dto.pet_profile.response.PetCalorieSuggestionResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterLogResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterSummaryResponseDTO;
import com.elif.dto.pet_profile.response.PetWeightLogResponseDTO;
import com.elif.dto.pet_profile.response.PetAIMealPlanResponseDTO;
import com.elif.dto.pet_profile.response.PetPhotoProfileAnalysisResponseDTO;
import com.elif.entities.pet_profile.PetWaterLog;
import com.elif.entities.pet_profile.PetWeightLog;
import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.elif.services.pet_profile.interfaces.PetProfileService;
import com.elif.services.pet_profile.ai.PetPhotoProfileInferenceService;
import com.elif.services.pet_profile.ai.PetAIProfileWizardService;
import com.elif.services.pet_profile.nutrition.PetAIMealPlanGenerationService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/user-pets")
public class PetProfileController {

    private final PetProfileService petProfileService;
    private final PetAIMealPlanGenerationService aiMealPlanService;
    private final PetPhotoProfileInferenceService petPhotoProfileInferenceService;
    private final PetAIProfileWizardService petAIProfileWizardService;

    public PetProfileController(PetProfileService petProfileService, 
                               PetAIMealPlanGenerationService aiMealPlanService,
                               PetPhotoProfileInferenceService petPhotoProfileInferenceService,
                               PetAIProfileWizardService petAIProfileWizardService) {
        this.petProfileService = petProfileService;
        this.aiMealPlanService = aiMealPlanService;
        this.petPhotoProfileInferenceService = petPhotoProfileInferenceService;
        this.petAIProfileWizardService = petAIProfileWizardService;
    }

    @GetMapping
    public ResponseEntity<List<PetProfileResponseDTO>> getMyPets(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) PetSpecies species) {
        Long userId = validateUserId(userIdHeader);
        List<PetProfileResponseDTO> response = petProfileService.findMyPets(userId, species)
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{petId}")
    public ResponseEntity<PetProfileResponseDTO> getMyPetById(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(toResponse(petProfileService.findMyPetById(userId, petId)));
    }

    @PostMapping
    public ResponseEntity<PetProfileResponseDTO> createMyPet(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @Valid @RequestBody PetProfileRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetProfile created = petProfileService.createMyPet(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @PutMapping("/{petId}")
    public ResponseEntity<PetProfileResponseDTO> updateMyPet(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetProfileRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(toResponse(petProfileService.updateMyPet(userId, petId, request)));
    }

    @PutMapping("/{petId}/location")
    public ResponseEntity<PetProfileResponseDTO> updateMyPetLocation(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetLocationUpdateRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(toResponse(petProfileService.updateMyPetLocation(userId, petId, request)));
    }

    @PostMapping(value = "/{petId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PetProfileResponseDTO> uploadMyPetPhoto(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestPart("file") MultipartFile file) {
        Long userId = validateUserId(userIdHeader);
        PetProfile updated = petProfileService.uploadMyPetPhoto(userId, petId, file);
        return ResponseEntity.ok(toResponse(updated));
    }

    @PostMapping(value = {"/ai/profile-from-photo", "/ai-profile-from-photo"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PetPhotoProfileAnalysisResponseDTO> analyzePetPhotoForProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestPart("file") MultipartFile file) {
        validateUserId(userIdHeader);
        return ResponseEntity.ok(petPhotoProfileInferenceService.inferProfileFromPhoto(file));
    }

    @PostMapping(value = "/ai/wizard-analysis", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PetAIProfileWizardResponseDTO> analyzeForWizard(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestPart("file") MultipartFile file) {
        validateUserId(userIdHeader);
        return ResponseEntity.ok(petAIProfileWizardService.analyzeForWizard(file));
    }

    @DeleteMapping("/{petId}")
    public ResponseEntity<Void> deleteMyPet(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPet(userId, petId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{petId}/health-history")
    public ResponseEntity<List<PetHealthRecordResponseDTO>> getMyPetHealthHistory(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        List<PetHealthRecordResponseDTO> response = petProfileService.findMyPetHealthHistory(userId, petId)
                .stream()
                .map(this::toHealthResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{petId}/health-history")
    public ResponseEntity<PetHealthRecordResponseDTO> createMyPetHealthRecord(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetHealthRecordRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetHealthRecord created = petProfileService.createMyPetHealthRecord(userId, petId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toHealthResponse(created));
    }

    @PutMapping("/{petId}/health-history/{recordId}")
    public ResponseEntity<PetHealthRecordResponseDTO> updateMyPetHealthRecord(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long recordId,
            @Valid @RequestBody PetHealthRecordRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetHealthRecord updated = petProfileService.updateMyPetHealthRecord(userId, petId, recordId, request);
        return ResponseEntity.ok(toHealthResponse(updated));
    }

    @DeleteMapping("/{petId}/health-history/{recordId}")
    public ResponseEntity<Void> deleteMyPetHealthRecord(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long recordId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPetHealthRecord(userId, petId, recordId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{petId}/tasks")
    public ResponseEntity<List<PetCareTaskResponseDTO>> getMyPetTasks(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        List<PetCareTaskResponseDTO> response = petProfileService.findMyPetTasks(userId, petId)
                .stream()
                .map(this::toTaskResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{petId}/tasks")
    public ResponseEntity<PetCareTaskResponseDTO> createMyPetTask(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetCareTaskRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetCareTask created = petProfileService.createMyPetTask(userId, petId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toTaskResponse(created));
    }

    @PutMapping("/{petId}/tasks/{taskId}")
    public ResponseEntity<PetCareTaskResponseDTO> updateMyPetTask(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long taskId,
            @Valid @RequestBody PetCareTaskRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetCareTask updated = petProfileService.updateMyPetTask(userId, petId, taskId, request);
        return ResponseEntity.ok(toTaskResponse(updated));
    }

    @DeleteMapping("/{petId}/tasks/{taskId}")
    public ResponseEntity<Void> deleteMyPetTask(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long taskId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPetTask(userId, petId, taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{petId}/nutrition-profile")
    public ResponseEntity<PetNutritionProfileResponseDTO> getMyPetNutritionProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        PetNutritionProfile profile = petProfileService.getMyPetNutritionProfile(userId, petId);
        return ResponseEntity.ok(toNutritionProfileResponse(profile));
    }

    @PutMapping("/{petId}/nutrition-profile")
    public ResponseEntity<PetNutritionProfileResponseDTO> upsertMyPetNutritionProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetNutritionProfileRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetNutritionProfile updated = petProfileService.upsertMyPetNutritionProfile(userId, petId, request);
        return ResponseEntity.ok(toNutritionProfileResponse(updated));
    }

    @GetMapping("/{petId}/feeding-logs")
    public ResponseEntity<List<PetFeedingLogResponseDTO>> getMyPetFeedingLogs(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate) {
        Long userId = validateUserId(userIdHeader);
        List<PetFeedingLogResponseDTO> response = petProfileService.getMyPetFeedingLogs(userId, petId, fromDate, toDate)
                .stream()
                .map(this::toFeedingLogResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{petId}/feeding-logs")
    public ResponseEntity<PetFeedingLogResponseDTO> createMyPetFeedingLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetFeedingLogRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetFeedingLog created = petProfileService.createMyPetFeedingLog(userId, petId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toFeedingLogResponse(created));
    }

    @PutMapping("/{petId}/feeding-logs/{logId}")
    public ResponseEntity<PetFeedingLogResponseDTO> updateMyPetFeedingLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long logId,
            @Valid @RequestBody PetFeedingLogRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetFeedingLog updated = petProfileService.updateMyPetFeedingLog(userId, petId, logId, request);
        return ResponseEntity.ok(toFeedingLogResponse(updated));
    }

    @DeleteMapping("/{petId}/feeding-logs/{logId}")
    public ResponseEntity<Void> deleteMyPetFeedingLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long logId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPetFeedingLog(userId, petId, logId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{petId}/nutrition-summary")
    public ResponseEntity<PetNutritionSummaryResponseDTO> getMyPetNutritionSummary(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getMyPetNutritionSummary(userId, petId));
    }

    @GetMapping("/{petId}/nutrition-insights")
    public ResponseEntity<PetNutritionInsightsResponseDTO> getMyPetNutritionInsights(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestParam(required = false) Integer days) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getMyPetNutritionInsights(userId, petId, days));
    }

    @GetMapping("/{petId}/nutrition-profile/suggest")
    public ResponseEntity<PetCalorieSuggestionResponseDTO> suggestCaloriesForPet(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestParam(required = false) PetActivityLevel activityLevel,
            @RequestParam(required = false) PetNutritionGoal goal) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.suggestCaloriesForPet(userId, petId, activityLevel, goal));
    }

    @GetMapping("/{petId}/ai-meal-plan")
    public ResponseEntity<PetAIMealPlanResponseDTO> generateAIMealPlan(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        PetProfile pet = petProfileService.findMyPetById(userId, petId);
        PetNutritionProfile nutritionProfile = petProfileService.getMyPetNutritionProfile(userId, petId);
        
        if (nutritionProfile == null) {
            throw new IllegalArgumentException("Nutrition profile not found for pet " + petId + 
                    ". Please create a nutrition profile first.");
        }
        
        PetAIMealPlanResponseDTO mealPlan = aiMealPlanService.generateMealPlan(pet, nutritionProfile);
        return ResponseEntity.ok(mealPlan);
    }

    // ── Weight log endpoints ─────────────────────────────────────────────────

    @GetMapping("/{petId}/weight-logs")
    public ResponseEntity<List<PetWeightLogResponseDTO>> getMyPetWeightLogs(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getMyPetWeightLogs(userId, petId));
    }

    @PostMapping("/{petId}/weight-logs")
    public ResponseEntity<PetWeightLogResponseDTO> createMyPetWeightLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetWeightLogRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetWeightLog created = petProfileService.createMyPetWeightLog(userId, petId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toWeightLogResponse(created, null));
    }

    @DeleteMapping("/{petId}/weight-logs/{logId}")
    public ResponseEntity<Void> deleteMyPetWeightLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long logId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPetWeightLog(userId, petId, logId);
        return ResponseEntity.noContent().build();
    }

    // ── Water log endpoints ──────────────────────────────────────────────────

    @GetMapping("/{petId}/water-logs")
    public ResponseEntity<List<PetWaterLogResponseDTO>> getMyPetWaterLogs(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestParam(required = false) LocalDate date) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getMyPetWaterLogs(userId, petId, date)
                .stream().map(this::toWaterLogResponse).toList());
    }

    @PostMapping("/{petId}/water-logs")
    public ResponseEntity<PetWaterLogResponseDTO> createMyPetWaterLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetWaterLogRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        PetWaterLog created = petProfileService.createMyPetWaterLog(userId, petId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toWaterLogResponse(created));
    }

    @DeleteMapping("/{petId}/water-logs/{logId}")
    public ResponseEntity<Void> deleteMyPetWaterLog(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @PathVariable Long logId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deleteMyPetWaterLog(userId, petId, logId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{petId}/water-summary")
    public ResponseEntity<PetWaterSummaryResponseDTO> getMyPetWaterSummary(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getMyPetWaterSummary(userId, petId));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<PetProfileResponseDTO>> getAllPetsForAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestParam(required = false) PetSpecies species) {
        Long userId = validateUserId(userIdHeader);
        List<PetProfileResponseDTO> response = petProfileService.findAllPetsForAdmin(userId, species)
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/admin/{petId}")
    public ResponseEntity<PetProfileResponseDTO> updatePetAsAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @Valid @RequestBody PetProfileRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(toResponse(petProfileService.updatePetAsAdmin(userId, petId, request)));
    }

    @PostMapping(value = "/admin/{petId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PetProfileResponseDTO> uploadPetPhotoAsAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId,
            @RequestPart("file") MultipartFile file) {
        Long userId = validateUserId(userIdHeader);
        PetProfile updated = petProfileService.uploadPetPhotoAsAdmin(userId, petId, file);
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/admin/{petId}")
    public ResponseEntity<Void> deletePetAsAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @PathVariable Long petId) {
        Long userId = validateUserId(userIdHeader);
        petProfileService.deletePetAsAdmin(userId, petId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<AdminPetDashboardStatsDTO> getAdminPetStats(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.getAdminPetDashboardStats(userId));
    }

    @PostMapping("/admin/bulk-update")
    public ResponseEntity<AdminPetBulkOperationResultDTO> bulkUpdatePetsAsAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @Valid @RequestBody AdminPetBulkUpdateRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.bulkUpdatePetsAsAdmin(userId, request));
    }

    @PostMapping("/admin/bulk-delete")
    public ResponseEntity<AdminPetBulkOperationResultDTO> bulkDeletePetsAsAdmin(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @Valid @RequestBody AdminPetBulkDeleteRequestDTO request) {
        Long userId = validateUserId(userIdHeader);
        return ResponseEntity.ok(petProfileService.bulkDeletePetsAsAdmin(userId, request));
    }

    private PetProfileResponseDTO toResponse(PetProfile profile) {
        return PetProfileResponseDTO.builder()
                .id(profile.getId())
                .userId(profile.getUser() != null ? profile.getUser().getId() : null)
                .name(profile.getName())
                .weight(profile.getWeight())
                .species(profile.getSpecies())
                .breed(profile.getBreed())
                .dateOfBirth(profile.getDateOfBirth())
                .ageDisplay(profile.formatAge())
                .gender(profile.getGender())
                .photoUrl(profile.getPhotoUrl())
                .latitude(profile.getLatitude())
                .longitude(profile.getLongitude())
                .locationUpdatedAt(profile.getLocationUpdatedAt())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    private PetHealthRecordResponseDTO toHealthResponse(PetHealthRecord record) {
        return PetHealthRecordResponseDTO.builder()
                .id(record.getId())
                .petId(record.getPet() != null ? record.getPet().getId() : null)
                .recordDate(record.getRecordDate())
                .visitType(record.getVisitType())
                .veterinarian(record.getVeterinarian())
                .clinicName(record.getClinicName())
                .bloodType(record.getBloodType())
                .spayedNeutered(record.getSpayedNeutered())
                .allergies(record.getAllergies())
                .chronicConditions(record.getChronicConditions())
                .previousOperations(record.getPreviousOperations())
                .vaccinationHistory(record.getVaccinationHistory())
                .specialDiet(record.getSpecialDiet())
                .parasitePrevention(record.getParasitePrevention())
                .emergencyInstructions(record.getEmergencyInstructions())
                .diagnosis(record.getDiagnosis())
                .treatment(record.getTreatment())
                .medications(record.getMedications())
                .notes(record.getNotes())
                .nextVisitDate(record.getNextVisitDate())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private PetCareTaskResponseDTO toTaskResponse(PetCareTask task) {
        return PetCareTaskResponseDTO.builder()
                .id(task.getId())
                .petId(task.getPet() != null ? task.getPet().getId() : null)
                .title(task.getTitle())
                .category(task.getCategory())
                .urgency(task.getUrgency())
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .notes(task.getNotes())
                .recurrence(task.getRecurrence())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    private PetNutritionProfileResponseDTO toNutritionProfileResponse(PetNutritionProfile profile) {
        return PetNutritionProfileResponseDTO.builder()
                .id(profile.getId())
                .petId(profile.getPet() != null ? profile.getPet().getId() : null)
                .goal(profile.getGoal())
                .activityLevel(profile.getActivityLevel())
                .targetWeightKg(profile.getTargetWeightKg())
                .dailyCalorieTarget(profile.getDailyCalorieTarget())
                .mealsPerDay(profile.getMealsPerDay())
                .foodPreference(profile.getFoodPreference())
                .allergies(profile.getAllergies())
                .forbiddenIngredients(profile.getForbiddenIngredients())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    private PetFeedingLogResponseDTO toFeedingLogResponse(PetFeedingLog log) {
        return PetFeedingLogResponseDTO.builder()
                .id(log.getId())
                .petId(log.getPet() != null ? log.getPet().getId() : null)
                .fedAt(log.getFedAt())
                .mealLabel(log.getMealLabel())
                .foodName(log.getFoodName())
                .portionGrams(log.getPortionGrams())
                .caloriesActual(log.getCaloriesActual())
                .proteinGrams(log.getProteinGrams())
                .fatGrams(log.getFatGrams())
                .carbsGrams(log.getCarbsGrams())
                .status(log.getStatus())
                .note(log.getNote())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private PetWeightLogResponseDTO toWeightLogResponse(PetWeightLog log, java.math.BigDecimal changeKg) {
        return PetWeightLogResponseDTO.builder()
                .id(log.getId())
                .petId(log.getPet() != null ? log.getPet().getId() : null)
                .loggedDate(log.getLoggedDate())
                .weightKg(log.getWeightKg())
                .changeKg(changeKg)
                .note(log.getNote())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private PetWaterLogResponseDTO toWaterLogResponse(PetWaterLog log) {
        return PetWaterLogResponseDTO.builder()
                .id(log.getId())
                .petId(log.getPet() != null ? log.getPet().getId() : null)
                .loggedDate(log.getLoggedDate())
                .amountMl(log.getAmountMl())
                .note(log.getNote())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private Long validateUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.trim().isEmpty()) {
            throw new IllegalArgumentException("User ID header is missing. Please log in and try again.");
        }
        try {
            Long userId = Long.parseLong(userIdHeader.trim());
            if (userId <= 0) {
                throw new IllegalArgumentException("User ID must be a positive number.");
            }
            return userId;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("User ID header contains an invalid value: " + userIdHeader);
        }
    }
}
