package com.elif.services.pet_profile.impl;

import com.elif.dto.pet_profile.request.PetProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetHealthRecordRequestDTO;
import com.elif.dto.pet_profile.request.PetCareTaskRequestDTO;
import com.elif.dto.pet_profile.request.PetFeedingLogRequestDTO;
import com.elif.dto.pet_profile.request.PetNutritionProfileRequestDTO;
import com.elif.dto.pet_profile.request.PetLocationUpdateRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkDeleteRequestDTO;
import com.elif.dto.pet_profile.request.AdminPetBulkUpdateRequestDTO;
import com.elif.dto.pet_profile.response.AdminPetBulkOperationResultDTO;
import com.elif.dto.pet_profile.response.AdminPetDashboardStatsDTO;
import com.elif.dto.pet_profile.response.PetNutritionInsightsResponseDTO;
import com.elif.dto.pet_profile.response.PetNutritionSummaryResponseDTO;
import com.elif.dto.pet_profile.response.PetNutritionTrendPointDTO;
import com.elif.entities.user.Role;
import com.elif.entities.user.User;
import com.elif.entities.pet_profile.PetCareTask;
import com.elif.entities.pet_profile.PetFeedingLog;
import com.elif.entities.pet_profile.PetHealthRecord;
import com.elif.entities.pet_profile.PetNutritionProfile;
import com.elif.entities.pet_profile.PetProfile;
import com.elif.entities.pet_profile.enums.PetActivityLevel;
import com.elif.entities.pet_profile.enums.PetFeedingStatus;
import com.elif.entities.pet_profile.enums.PetNutritionGoal;
import com.elif.entities.pet_profile.enums.PetTaskRecurrence;
import com.elif.entities.pet_profile.enums.PetSpecies;
import com.elif.exceptions.pet_profile.PetProfileNotFoundException;
import com.elif.exceptions.pet_profile.UnauthorizedPetAccessException;
import com.elif.repositories.user.UserRepository;
import com.elif.repositories.pet_profile.PetCareTaskRepository;
import com.elif.repositories.pet_profile.PetFeedingLogRepository;
import com.elif.repositories.pet_profile.PetHealthRecordRepository;
import com.elif.repositories.pet_profile.PetNutritionProfileRepository;
import com.elif.repositories.pet_profile.PetProfileRepository;
import com.elif.dto.pet_profile.request.PetWaterLogRequestDTO;
import com.elif.dto.pet_profile.request.PetWeightLogRequestDTO;
import com.elif.dto.pet_profile.response.PetCalorieSuggestionResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterLogResponseDTO;
import com.elif.dto.pet_profile.response.PetWaterSummaryResponseDTO;
import com.elif.dto.pet_profile.response.PetWeightLogResponseDTO;
import com.elif.entities.pet_profile.PetWaterLog;
import com.elif.entities.pet_profile.PetWeightLog;
import com.elif.repositories.pet_profile.PetWaterLogRepository;
import com.elif.repositories.pet_profile.PetWeightLogRepository;
import com.elif.services.pet_profile.PetNotificationService;
import com.elif.services.pet_profile.interfaces.PetProfileService;
import com.elif.services.pet_transit.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PetProfileServiceImpl implements PetProfileService {

    private final PetProfileRepository petProfileRepository;
    private final PetHealthRecordRepository petHealthRecordRepository;
    private final PetCareTaskRepository petCareTaskRepository;
    private final PetNutritionProfileRepository petNutritionProfileRepository;
    private final PetFeedingLogRepository petFeedingLogRepository;
    private final PetWeightLogRepository petWeightLogRepository;
    private final PetWaterLogRepository petWaterLogRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final PetNotificationService petNotificationService;

    public PetProfileServiceImpl(PetProfileRepository petProfileRepository,
                                 PetHealthRecordRepository petHealthRecordRepository,
                                 PetCareTaskRepository petCareTaskRepository,
                                 PetNutritionProfileRepository petNutritionProfileRepository,
                                 PetFeedingLogRepository petFeedingLogRepository,
                                 PetWeightLogRepository petWeightLogRepository,
                                 PetWaterLogRepository petWaterLogRepository,
                                 UserRepository userRepository,
                                 FileStorageService fileStorageService,
                                 PetNotificationService petNotificationService) {
        this.petProfileRepository = petProfileRepository;
        this.petHealthRecordRepository = petHealthRecordRepository;
        this.petCareTaskRepository = petCareTaskRepository;
        this.petNutritionProfileRepository = petNutritionProfileRepository;
        this.petFeedingLogRepository = petFeedingLogRepository;
        this.petWeightLogRepository = petWeightLogRepository;
        this.petWaterLogRepository = petWaterLogRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.petNotificationService = petNotificationService;
    }

    @Override
    public List<PetProfile> findMyPets(Long userId, PetSpecies species) {
        ensureUserExists(userId);
        if (species != null) {
            return petProfileRepository.findByUserIdAndSpeciesOrderByCreatedAtDesc(userId, species);
        }
        return petProfileRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public PetProfile findMyPetById(Long userId, Long petId) {
        ensureUserExists(userId);
        return petProfileRepository.findByIdAndUserId(petId, userId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
    }

    @Override
    public PetProfile createMyPet(Long userId, PetProfileRequestDTO request) {
        User user = ensureUserExists(userId);
        PetProfile profile = new PetProfile();
        profile.setUser(user);
        applyRequest(profile, request);
        return petProfileRepository.save(profile);
    }

    @Override
    public PetProfile updateMyPet(Long userId, Long petId, PetProfileRequestDTO request) {
        ensureUserExists(userId);
        PetProfile existing = petProfileRepository.findByIdAndUserId(petId, userId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        applyRequest(existing, request);
        return petProfileRepository.save(existing);
    }

    @Override
    public PetProfile updateMyPetLocation(Long userId, Long petId, PetLocationUpdateRequestDTO request) {
        ensureUserExists(userId);
        PetProfile profile = petProfileRepository.findByIdAndUserId(petId, userId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        profile.setLatitude(request.getLatitude());
        profile.setLongitude(request.getLongitude());
        profile.setLocationUpdatedAt(LocalDateTime.now());
        return petProfileRepository.save(profile);
    }

    @Override
    public PetProfile uploadMyPetPhoto(Long userId, Long petId, MultipartFile file) {
        ensureUserExists(userId);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Pet image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        if (file.getSize() > 5L * 1024L * 1024L) {
            throw new IllegalArgumentException("Image size must be 5MB or less");
        }

        PetProfile existing = petProfileRepository.findByIdAndUserId(petId, userId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        deleteManagedPhotoIfAny(existing.getPhotoUrl());
        String storedUrl = fileStorageService.storeFile(file, "pets/photos");

        existing.setPhotoUrl(storedUrl);
        return petProfileRepository.save(existing);
    }

    @Override
    public void deleteMyPet(Long userId, Long petId) {
        ensureUserExists(userId);
        PetProfile existing = petProfileRepository.findByIdAndUserId(petId, userId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        petHealthRecordRepository.deleteByPetId(existing.getId());
        petCareTaskRepository.deleteByPetId(existing.getId());
        petFeedingLogRepository.deleteByPetId(existing.getId());
        petNutritionProfileRepository.deleteByPetId(existing.getId());
        deleteManagedPhotoIfAny(existing.getPhotoUrl());
        petProfileRepository.delete(existing);
    }

    @Override
    public PetNutritionProfile getMyPetNutritionProfile(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        return petNutritionProfileRepository.findByPetId(pet.getId())
                .orElseGet(() -> buildDefaultNutritionProfile(pet));
    }

    @Override
    public PetNutritionProfile upsertMyPetNutritionProfile(Long userId, Long petId, PetNutritionProfileRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetNutritionProfile profile = petNutritionProfileRepository.findByPetId(pet.getId())
                .orElseGet(() -> {
                    PetNutritionProfile created = new PetNutritionProfile();
                    created.setPet(pet);
                    return created;
                });

        applyNutritionProfileRequest(profile, request);
        return petNutritionProfileRepository.save(profile);
    }

    @Override
    public List<PetFeedingLog> getMyPetFeedingLogs(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        return petFeedingLogRepository.findByPetIdOrderByFedAtDesc(pet.getId());
    }

    @Override
    public List<PetFeedingLog> getMyPetFeedingLogs(Long userId, Long petId, LocalDate fromDate, LocalDate toDate) {
        PetProfile pet = findMyPetById(userId, petId);
        if (fromDate == null && toDate == null) {
            return petFeedingLogRepository.findByPetIdOrderByFedAtDesc(pet.getId());
        }

        LocalDate effectiveFrom = fromDate != null ? fromDate : toDate.minusDays(30);
        LocalDate effectiveTo = toDate != null ? toDate : fromDate.plusDays(30);
        if (effectiveTo.isBefore(effectiveFrom)) {
            throw new IllegalArgumentException("toDate must be after or equal to fromDate");
        }

        return petFeedingLogRepository.findByPetIdAndFedAtBetweenOrderByFedAtDesc(
                pet.getId(),
                effectiveFrom.atStartOfDay(),
                effectiveTo.plusDays(1).atStartOfDay()
        );
    }

    @Override
    public PetFeedingLog createMyPetFeedingLog(Long userId, Long petId, PetFeedingLogRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetFeedingLog log = new PetFeedingLog();
        log.setPet(pet);
        applyFeedingLogRequest(log, request);
        return petFeedingLogRepository.save(log);
    }

    @Override
    public PetFeedingLog updateMyPetFeedingLog(Long userId, Long petId, Long logId, PetFeedingLogRequestDTO request) {
        findMyPetById(userId, petId);
        PetFeedingLog existing = petFeedingLogRepository.findByIdAndPetId(logId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Feeding log not found for this pet"));
        applyFeedingLogRequest(existing, request);
        return petFeedingLogRepository.save(existing);
    }

    @Override
    public void deleteMyPetFeedingLog(Long userId, Long petId, Long logId) {
        findMyPetById(userId, petId);
        PetFeedingLog existing = petFeedingLogRepository.findByIdAndPetId(logId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Feeding log not found for this pet"));
        petFeedingLogRepository.delete(existing);
    }

        @Override
        public PetNutritionSummaryResponseDTO getMyPetNutritionSummary(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        PetNutritionProfile profile = petNutritionProfileRepository.findByPetId(pet.getId())
            .orElseGet(() -> buildDefaultNutritionProfile(pet));

        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        List<PetFeedingLog> todayLogs = petFeedingLogRepository
            .findByPetIdAndFedAtBetweenOrderByFedAtDesc(pet.getId(), start, end);

        int todayCalories = todayLogs.stream()
            .filter(log -> log.getCaloriesActual() != null)
            .mapToInt(PetFeedingLog::getCaloriesActual)
            .sum();

        long completedMeals = todayLogs.stream()
            .filter(log -> log.getStatus() == PetFeedingStatus.GIVEN)
            .count();

        int dailyTarget = profile.getDailyCalorieTarget() != null ? profile.getDailyCalorieTarget() : 0;
        int remaining = Math.max(0, dailyTarget - todayCalories);
        int plannedMeals = profile.getMealsPerDay() != null ? profile.getMealsPerDay() : 0;
        int adherence = dailyTarget > 0
            ? (int) Math.min(100, Math.round((todayCalories * 100.0) / dailyTarget))
            : 0;

        // Macro totals
        java.math.BigDecimal todayProtein = todayLogs.stream()
            .filter(l -> l.getProteinGrams() != null)
            .map(PetFeedingLog::getProteinGrams)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal todayFat = todayLogs.stream()
            .filter(l -> l.getFatGrams() != null)
            .map(PetFeedingLog::getFatGrams)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal todayCarbs = todayLogs.stream()
            .filter(l -> l.getCarbsGrams() != null)
            .map(PetFeedingLog::getCarbsGrams)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        // Water intake
        int todayWaterMl = petWaterLogRepository.sumAmountMlByPetIdAndDate(pet.getId(), today);
        int dailyWaterTargetMl = estimateDailyWaterMl(pet);
        int waterAdherence = dailyWaterTargetMl > 0
            ? (int) Math.min(100, Math.round((todayWaterMl * 100.0) / dailyWaterTargetMl))
            : 0;

        // Weight progress
        java.math.BigDecimal currentWeight = petWeightLogRepository
            .findFirstByPetIdOrderByLoggedDateDesc(pet.getId())
            .map(PetWeightLog::getWeightKg)
            .orElse(pet.getWeight());
        java.math.BigDecimal targetWeight = profile.getTargetWeightKg();

        // Weight change vs previous log
        List<PetWeightLog> recentWeightLogs = petWeightLogRepository
            .findByPetIdAndLoggedDateBetweenOrderByLoggedDateDesc(pet.getId(), today.minusDays(30), today);
        java.math.BigDecimal weightChange = null;
        if (recentWeightLogs.size() >= 2) {
            weightChange = recentWeightLogs.get(0).getWeightKg()
                .subtract(recentWeightLogs.get(recentWeightLogs.size() - 1).getWeightKg());
        }

        return PetNutritionSummaryResponseDTO.builder()
            .dailyCalorieTarget(dailyTarget)
            .todayCalories(todayCalories)
            .remainingCalories(remaining)
            .plannedMealsPerDay(plannedMeals)
            .mealsLoggedToday((long) todayLogs.size())
            .mealsCompletedToday(completedMeals)
            .adherencePercent(adherence)
            .todayProteinGrams(todayProtein)
            .todayFatGrams(todayFat)
            .todayCarbsGrams(todayCarbs)
            .todayWaterMl(todayWaterMl)
            .dailyWaterTargetMl(dailyWaterTargetMl)
            .waterAdherencePercent(waterAdherence)
            .currentWeightKg(currentWeight)
            .targetWeightKg(targetWeight)
            .weightChangeKg(weightChange)
            .build();
        }

    @Override
    public PetNutritionInsightsResponseDTO getMyPetNutritionInsights(Long userId, Long petId, Integer days) {
        PetProfile pet = findMyPetById(userId, petId);
        PetNutritionProfile profile = petNutritionProfileRepository.findByPetId(pet.getId())
                .orElseGet(() -> buildDefaultNutritionProfile(pet));

        int periodDays = Math.max(7, Math.min(90, days != null ? days : 14));
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(periodDays - 1L);

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime endExclusive = endDate.plusDays(1).atStartOfDay();

        List<PetFeedingLog> periodLogs = petFeedingLogRepository
                .findByPetIdAndFedAtBetweenOrderByFedAtDesc(pet.getId(), start, endExclusive);

        Map<LocalDate, List<PetFeedingLog>> byDate = new LinkedHashMap<>();
        for (int i = 0; i < periodDays; i++) {
            LocalDate date = startDate.plusDays(i);
            byDate.put(date, new ArrayList<>());
        }

        for (PetFeedingLog log : periodLogs) {
            LocalDate date = log.getFedAt() != null ? log.getFedAt().toLocalDate() : null;
            if (date != null && byDate.containsKey(date)) {
                byDate.get(date).add(log);
            }
        }

        int target = profile.getDailyCalorieTarget() != null ? profile.getDailyCalorieTarget() : 0;
        int totalCalories = 0;
        int daysWithLogs = 0;
        int adherenceAccumulator = 0;
        int adherenceDayCount = 0;

        List<PetNutritionTrendPointDTO> trend = new ArrayList<>();
        int currentStreak = 0;
        int maxStreak = 0;

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        statusBreakdown.put(PetFeedingStatus.GIVEN.name(), 0L);
        statusBreakdown.put(PetFeedingStatus.PARTIAL.name(), 0L);
        statusBreakdown.put(PetFeedingStatus.SKIPPED.name(), 0L);

        List<LocalDate> dates = new ArrayList<>(byDate.keySet());
        dates.sort(Comparator.naturalOrder());
        for (LocalDate date : dates) {
            List<PetFeedingLog> dayLogs = byDate.get(date);
            int dayCalories = dayLogs.stream()
                    .filter(log -> log.getCaloriesActual() != null)
                    .mapToInt(PetFeedingLog::getCaloriesActual)
                    .sum();
            long meals = dayLogs.size();

            for (PetFeedingLog dayLog : dayLogs) {
                PetFeedingStatus status = dayLog.getStatus();
                if (status != null) {
                    statusBreakdown.put(status.name(), statusBreakdown.getOrDefault(status.name(), 0L) + 1L);
                }
            }

            if (meals > 0) {
                daysWithLogs++;
                totalCalories += dayCalories;
                int dayAdherence = target > 0
                        ? (int) Math.min(100, Math.round((dayCalories * 100.0) / target))
                        : 0;
                adherenceAccumulator += dayAdherence;
                adherenceDayCount++;

                boolean reached = target <= 0 || dayCalories >= Math.round(target * 0.9);
                if (reached) {
                    currentStreak++;
                    maxStreak = Math.max(maxStreak, currentStreak);
                } else {
                    currentStreak = 0;
                }

                trend.add(PetNutritionTrendPointDTO.builder()
                        .date(date)
                        .calories(dayCalories)
                        .target(target)
                        .meals(meals)
                        .adherencePercent(dayAdherence)
                        .build());
            } else {
                currentStreak = 0;
                trend.add(PetNutritionTrendPointDTO.builder()
                        .date(date)
                        .calories(0)
                        .target(target)
                        .meals(0L)
                        .adherencePercent(0)
                        .build());
            }
        }

        int avgCalories = daysWithLogs > 0 ? Math.round(totalCalories / (float) daysWithLogs) : 0;
        int targetDelta = avgCalories - target;
        int adherencePercent = adherenceDayCount > 0
                ? Math.round(adherenceAccumulator / (float) adherenceDayCount)
                : 0;

        long totalLogs = periodLogs.size();
        long completed = periodLogs.stream().filter(log -> log.getStatus() == PetFeedingStatus.GIVEN).count();
        int completionRate = totalLogs > 0 ? (int) Math.round((completed * 100.0) / totalLogs) : 0;

        List<String> recommendations = buildNutritionRecommendations(
                target,
                avgCalories,
                adherencePercent,
                completionRate,
                profile,
                daysWithLogs,
                periodDays
        );

        return PetNutritionInsightsResponseDTO.builder()
                .periodDays(periodDays)
                .dailyCalorieTarget(target)
                .averageDailyCalories(avgCalories)
                .calorieTargetDelta(targetDelta)
                .adherencePercent(adherencePercent)
                .completionRatePercent(completionRate)
                .streakDays(currentStreak)
                .longestStreakDays(maxStreak)
                .statusBreakdown(statusBreakdown)
                .calorieTrend(trend)
                .recommendations(recommendations)
                .build();
    }

    @Override
    public List<PetCareTask> findMyPetTasks(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        return petCareTaskRepository.findByPetIdOrderByUpdatedAtDesc(pet.getId());
    }

    @Override
    public PetCareTask createMyPetTask(Long userId, Long petId, PetCareTaskRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetCareTask task = new PetCareTask();
        task.setPet(pet);
        applyTaskRequest(task, request);
        PetCareTask saved = petCareTaskRepository.save(task);
        
        // Send notification for urgent care tasks
        petNotificationService.notifyUrgentCareTask(userId, saved);
        
        return saved;
    }

    @Override
    public PetCareTask updateMyPetTask(Long userId, Long petId, Long taskId, PetCareTaskRequestDTO request) {
        findMyPetById(userId, petId);
        PetCareTask existing = petCareTaskRepository.findByIdAndPetId(taskId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found for this pet"));
        applyTaskRequest(existing, request);
        return petCareTaskRepository.save(existing);
    }

    @Override
    public void deleteMyPetTask(Long userId, Long petId, Long taskId) {
        findMyPetById(userId, petId);
        PetCareTask existing = petCareTaskRepository.findByIdAndPetId(taskId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found for this pet"));
        petCareTaskRepository.delete(existing);
    }

    @Override
    public List<PetHealthRecord> findMyPetHealthHistory(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        return petHealthRecordRepository.findByPetIdOrderByRecordDateDescCreatedAtDesc(pet.getId());
    }

    @Override
    public PetHealthRecord createMyPetHealthRecord(Long userId, Long petId, PetHealthRecordRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetHealthRecord record = new PetHealthRecord();
        record.setPet(pet);
        applyHealthRecordRequest(record, request);
        PetHealthRecord saved = petHealthRecordRepository.save(record);
        
        // Send notification for new health record
        petNotificationService.notifyNewHealthRecord(userId, saved);
        
        return saved;
    }

    @Override
    public PetHealthRecord updateMyPetHealthRecord(Long userId, Long petId, Long recordId, PetHealthRecordRequestDTO request) {
        findMyPetById(userId, petId);
        PetHealthRecord existing = petHealthRecordRepository.findByIdAndPetId(recordId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Health record not found for this pet"));
        applyHealthRecordRequest(existing, request);
        return petHealthRecordRepository.save(existing);
    }

    @Override
    public void deleteMyPetHealthRecord(Long userId, Long petId, Long recordId) {
        findMyPetById(userId, petId);
        PetHealthRecord existing = petHealthRecordRepository.findByIdAndPetId(recordId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Health record not found for this pet"));
        petHealthRecordRepository.delete(existing);
    }

    @Override
    public List<PetProfile> findAllPetsForAdmin(Long adminUserId, PetSpecies species) {
        ensureAdmin(adminUserId);
        if (species == null) {
            return petProfileRepository.findAllByOrderByCreatedAtDesc();
        }
        return petProfileRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(profile -> profile.getSpecies() == species)
                .toList();
    }

    @Override
    public PetProfile updatePetAsAdmin(Long adminUserId, Long petId, PetProfileRequestDTO request) {
        ensureAdmin(adminUserId);
        PetProfile profile = petProfileRepository.findById(petId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        applyRequest(profile, request);
        return petProfileRepository.save(profile);
    }

    @Override
    public PetProfile uploadPetPhotoAsAdmin(Long adminUserId, Long petId, MultipartFile file) {
        ensureAdmin(adminUserId);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Pet image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        if (file.getSize() > 5L * 1024L * 1024L) {
            throw new IllegalArgumentException("Image size must be 5MB or less");
        }

        PetProfile profile = petProfileRepository.findById(petId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        deleteManagedPhotoIfAny(profile.getPhotoUrl());
        String storedUrl = fileStorageService.storeFile(file, "pets/photos");

        profile.setPhotoUrl(storedUrl);
        return petProfileRepository.save(profile);
    }

    @Override
    public void deletePetAsAdmin(Long adminUserId, Long petId) {
        ensureAdmin(adminUserId);
        PetProfile profile = petProfileRepository.findById(petId)
                .orElseThrow(() -> new PetProfileNotFoundException(petId));
        petHealthRecordRepository.deleteByPetId(profile.getId());
        petCareTaskRepository.deleteByPetId(profile.getId());
        petFeedingLogRepository.deleteByPetId(profile.getId());
        petNutritionProfileRepository.deleteByPetId(profile.getId());
        deleteManagedPhotoIfAny(profile.getPhotoUrl());
        petProfileRepository.delete(profile);
    }

    @Override
    public AdminPetBulkOperationResultDTO bulkUpdatePetsAsAdmin(Long adminUserId, AdminPetBulkUpdateRequestDTO request) {
        ensureAdmin(adminUserId);

        List<Long> petIds = sanitizePetIds(request.getPetIds());
        List<String> errors = new ArrayList<>();
        int succeeded = 0;

        for (Long petId : petIds) {
            try {
                PetProfile profile = petProfileRepository.findById(petId)
                        .orElseThrow(() -> new PetProfileNotFoundException(petId));

                if (request.getSpecies() != null) {
                    profile.setSpecies(request.getSpecies());
                }
                if (request.getGender() != null) {
                    profile.setGender(request.getGender());
                }
                if (request.getBreed() != null) {
                    profile.setBreed(normalize(request.getBreed()));
                }

                petProfileRepository.save(profile);
                succeeded++;
            } catch (Exception ex) {
                errors.add("Pet #" + petId + ": " + ex.getMessage());
            }
        }

        return AdminPetBulkOperationResultDTO.builder()
                .requested(petIds.size())
                .succeeded(succeeded)
                .failed(petIds.size() - succeeded)
                .errors(errors)
                .build();
    }

    @Override
    public AdminPetBulkOperationResultDTO bulkDeletePetsAsAdmin(Long adminUserId, AdminPetBulkDeleteRequestDTO request) {
        ensureAdmin(adminUserId);

        List<Long> petIds = sanitizePetIds(request.getPetIds());
        List<String> errors = new ArrayList<>();
        int succeeded = 0;

        for (Long petId : petIds) {
            try {
                PetProfile profile = petProfileRepository.findById(petId)
                        .orElseThrow(() -> new PetProfileNotFoundException(petId));

                petHealthRecordRepository.deleteByPetId(profile.getId());
                petCareTaskRepository.deleteByPetId(profile.getId());
                petFeedingLogRepository.deleteByPetId(profile.getId());
                petNutritionProfileRepository.deleteByPetId(profile.getId());
                deleteManagedPhotoIfAny(profile.getPhotoUrl());
                petProfileRepository.delete(profile);
                succeeded++;
            } catch (Exception ex) {
                errors.add("Pet #" + petId + ": " + ex.getMessage());
            }
        }

        return AdminPetBulkOperationResultDTO.builder()
                .requested(petIds.size())
                .succeeded(succeeded)
                .failed(petIds.size() - succeeded)
                .errors(errors)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPetDashboardStatsDTO getAdminPetDashboardStats(Long adminUserId) {
        ensureAdmin(adminUserId);
        List<PetProfile> pets = petProfileRepository.findAllByOrderByCreatedAtDesc();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime createdThreshold = now.minusDays(30);
        LocalDateTime updatedThreshold = now.minusDays(7);

        Map<String, Long> speciesBreakdown = new LinkedHashMap<>();
        for (PetSpecies species : PetSpecies.values()) {
            speciesBreakdown.put(species.name(), 0L);
        }

        long withPhoto = 0;
        long withGps = 0;
        long createdLast30Days = 0;
        long updatedLast7Days = 0;

        for (PetProfile pet : pets) {
            String speciesKey = pet.getSpecies() != null ? pet.getSpecies().name() : "OTHER";
            speciesBreakdown.put(speciesKey, speciesBreakdown.getOrDefault(speciesKey, 0L) + 1L);

            if (normalize(pet.getPhotoUrl()) != null) {
                withPhoto++;
            }
            if (pet.getLatitude() != null && pet.getLongitude() != null) {
                withGps++;
            }
            if (pet.getCreatedAt() != null && !pet.getCreatedAt().isBefore(createdThreshold)) {
                createdLast30Days++;
            }
            if (pet.getUpdatedAt() != null && !pet.getUpdatedAt().isBefore(updatedThreshold)) {
                updatedLast7Days++;
            }
        }

        return AdminPetDashboardStatsDTO.builder()
                .totalPets(pets.size())
                .petsWithPhoto(withPhoto)
                .petsWithGps(withGps)
                .createdLast30Days(createdLast30Days)
                .updatedLast7Days(updatedLast7Days)
                .speciesBreakdown(speciesBreakdown)
                .build();
    }

    private void applyTaskRequest(PetCareTask task, PetCareTaskRequestDTO request) {
        task.setTitle(request.getTitle().trim());
        task.setCategory(normalize(request.getCategory()) != null ? normalize(request.getCategory()) : "Other");
        task.setUrgency(request.getUrgency());
        task.setStatus(request.getStatus());
        task.setDueDate(request.getDueDate());
        task.setNotes(normalize(request.getNotes()));
        task.setRecurrence(request.getRecurrence() != null ? request.getRecurrence() : PetTaskRecurrence.NONE);
    }

    private void applyHealthRecordRequest(PetHealthRecord record, PetHealthRecordRequestDTO request) {
        record.setRecordDate(request.getRecordDate());
        record.setVisitType(request.getVisitType().trim());
        record.setVeterinarian(normalize(request.getVeterinarian()));
        record.setClinicName(normalize(request.getClinicName()));
        record.setBloodType(normalize(request.getBloodType()));
        record.setSpayedNeutered(normalize(request.getSpayedNeutered()));
        record.setAllergies(normalize(request.getAllergies()));
        record.setChronicConditions(normalize(request.getChronicConditions()));
        record.setPreviousOperations(normalize(request.getPreviousOperations()));
        record.setVaccinationHistory(normalize(request.getVaccinationHistory()));
        record.setSpecialDiet(normalize(request.getSpecialDiet()));
        record.setParasitePrevention(normalize(request.getParasitePrevention()));
        record.setEmergencyInstructions(normalize(request.getEmergencyInstructions()));
        record.setDiagnosis(normalize(request.getDiagnosis()));
        record.setTreatment(normalize(request.getTreatment()));
        record.setMedications(normalize(request.getMedications()));
        record.setNotes(normalize(request.getNotes()));
        record.setNextVisitDate(request.getNextVisitDate());
    }

    private void applyNutritionProfileRequest(PetNutritionProfile profile, PetNutritionProfileRequestDTO request) {
        profile.setGoal(request.getGoal());
        profile.setActivityLevel(request.getActivityLevel());
        profile.setTargetWeightKg(request.getTargetWeightKg());
        profile.setDailyCalorieTarget(request.getDailyCalorieTarget());
        profile.setMealsPerDay(request.getMealsPerDay());
        profile.setFoodPreference(normalize(request.getFoodPreference()));
        profile.setAllergies(normalize(request.getAllergies()));
        profile.setForbiddenIngredients(normalize(request.getForbiddenIngredients()));
    }

    private void applyFeedingLogRequest(PetFeedingLog log, PetFeedingLogRequestDTO request) {
        log.setFedAt(request.getFedAt());
        log.setMealLabel(normalize(request.getMealLabel()));
        log.setFoodName(request.getFoodName().trim());
        log.setPortionGrams(request.getPortionGrams());
        log.setCaloriesActual(request.getCaloriesActual());
        log.setProteinGrams(request.getProteinGrams());
        log.setFatGrams(request.getFatGrams());
        log.setCarbsGrams(request.getCarbsGrams());
        log.setStatus(request.getStatus());
        log.setNote(normalize(request.getNote()));
    }

    private PetNutritionProfile buildDefaultNutritionProfile(PetProfile pet) {
        int baselineCalories = estimateDailyCalories(pet);
        return PetNutritionProfile.builder()
                .id(null)
                .pet(pet)
                .goal(PetNutritionGoal.MAINTAIN)
                .activityLevel(PetActivityLevel.MODERATE)
                .targetWeightKg(pet.getWeight())
                .dailyCalorieTarget(baselineCalories)
                .mealsPerDay(2)
                .foodPreference(null)
                .allergies(null)
                .forbiddenIngredients(null)
                .createdAt(null)
                .updatedAt(null)
                .build();
    }

    private int estimateDailyCalories(PetProfile pet) {
        return estimateDailyCaloriesWithContext(pet, PetActivityLevel.MODERATE, PetNutritionGoal.MAINTAIN);
    }

    /**
     * Estimates daily calorie needs using Resting Energy Requirement (RER) formula,
     * adjusted for species, activity level, goal, and age.
     */
    private int estimateDailyCaloriesWithContext(PetProfile pet, PetActivityLevel activityLevel, PetNutritionGoal goal) {
        if (pet.getWeight() == null) {
            return 650;
        }

        double weight = Math.max(0.5, pet.getWeight().doubleValue());
        double rer = 70 * Math.pow(weight, 0.75);

        // Species base multiplier
        double speciesMultiplier;
        if (pet.getSpecies() == PetSpecies.CAT) {
            speciesMultiplier = 1.0;
        } else if (pet.getSpecies() == PetSpecies.DOG) {
            speciesMultiplier = 1.2;
        } else {
            speciesMultiplier = 1.1;
        }

        // Activity level multiplier
        double activityMultiplier = switch (activityLevel) {
            case LOW -> 1.0;
            case MODERATE -> 1.4;
            case HIGH -> 1.8;
        };

        // Goal adjustment
        double goalMultiplier = switch (goal) {
            case WEIGHT_LOSS -> 0.8;
            case WEIGHT_GAIN -> 1.2;
            case MEDICAL_DIET -> 1.0;
            default -> 1.0;
        };

        // Age adjustment: seniors (>7 years) need ~20% fewer calories
        Integer ageMonths = pet.calculateAgeInMonths();
        double ageMultiplier = 1.0;
        if (ageMonths != null && ageMonths > 84) {
            ageMultiplier = 0.8;
        } else if (ageMonths != null && ageMonths < 12) {
            // Puppies/kittens need more energy
            ageMultiplier = 1.5;
        }

        double total = rer * speciesMultiplier * activityMultiplier * goalMultiplier * ageMultiplier;
        return (int) Math.max(50, Math.min(5000, Math.round(total)));
    }

    /** Estimates daily water requirement in ml based on weight and species. */
    private int estimateDailyWaterMl(PetProfile pet) {
        if (pet.getWeight() == null) return 250;
        double weight = pet.getWeight().doubleValue();
        // General guideline: ~50 ml/kg for dogs, ~40 ml/kg for cats
        double mlPerKg = (pet.getSpecies() == PetSpecies.CAT) ? 40.0 : 50.0;
        return (int) Math.max(50, Math.round(weight * mlPerKg));
    }

    private List<String> buildNutritionRecommendations(int target,
                                                       int average,
                                                       int adherencePercent,
                                                       int completionRate,
                                                       PetNutritionProfile profile,
                                                       int daysWithLogs,
                                                       int periodDays) {
        List<String> recommendations = new ArrayList<>();

        if (daysWithLogs < Math.max(4, periodDays / 3)) {
            recommendations.add("Log feeding more consistently to unlock accurate nutrition trends.");
        }

        if (target > 0 && average < Math.round(target * 0.8)) {
            recommendations.add("Average intake is below target; review portion size or add one planned meal.");
        } else if (target > 0 && average > Math.round(target * 1.15)) {
            recommendations.add("Average intake is above target; reduce portion sizes for high-calorie meals.");
        }

        if (completionRate < 65) {
            recommendations.add("Meal completion is low; monitor appetite and discuss persistent changes with a vet.");
        }

        if (adherencePercent >= 90 && completionRate >= 80) {
            recommendations.add("Great consistency. Maintain this routine and re-evaluate goals every 2-4 weeks.");
        }

        if (profile.getGoal() == PetNutritionGoal.WEIGHT_LOSS && target > 0 && average > target) {
            recommendations.add("Weight-loss goal is active; keep intake slightly under target and track weekly weight.");
        }

        if (profile.getGoal() == PetNutritionGoal.WEIGHT_GAIN && target > 0 && average < target) {
            recommendations.add("Weight-gain goal is active; consider nutrient-dense additions to reach target calories.");
        }

        if (recommendations.isEmpty()) {
            recommendations.add("Nutrition performance is stable. Continue logging to preserve trend quality.");
        }

        return recommendations.stream().limit(4).toList();
    }

    private User ensureUserExists(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid user id"));
    }

    private void ensureAdmin(Long userId) {
        User user = ensureUserExists(userId);
        if (user.getRole() != Role.ADMIN) {
            throw new UnauthorizedPetAccessException("Admin role is required for this operation");
        }
    }

    private void applyRequest(PetProfile profile, PetProfileRequestDTO request) {
        String previousPhotoUrl = profile.getPhotoUrl();
        profile.setName(request.getName().trim());
        profile.setWeight(request.getWeight());
        profile.setSpecies(request.getSpecies());
        profile.setBreed(normalize(request.getBreed()));
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(request.getGender());
        String normalizedUrl = normalize(request.getPhotoUrl());
        profile.setPhotoUrl(normalizedUrl);
        if (request.getLatitude() != null && request.getLongitude() != null) {
            profile.setLatitude(request.getLatitude());
            profile.setLongitude(request.getLongitude());
            profile.setLocationUpdatedAt(LocalDateTime.now());
        }

        if (isManagedUploadUrl(previousPhotoUrl) && !sameText(previousPhotoUrl, normalizedUrl)) {
            deleteManagedPhotoIfAny(previousPhotoUrl);
        }
    }

    private void deleteManagedPhotoIfAny(String photoUrl) {
        if (!isManagedUploadUrl(photoUrl)) {
            return;
        }

        String normalizedForDeletion = photoUrl;
        if (normalizedForDeletion.startsWith("/elif/uploads/")) {
            normalizedForDeletion = normalizedForDeletion.substring("/elif".length());
        }
        if (normalizedForDeletion.startsWith("uploads/")) {
            normalizedForDeletion = "/" + normalizedForDeletion;
        }

        fileStorageService.deleteFile(normalizedForDeletion);
    }

    private boolean isManagedUploadUrl(String photoUrl) {
        if (photoUrl == null || photoUrl.trim().isEmpty()) {
            return false;
        }
        return photoUrl.startsWith("/uploads/")
                || photoUrl.startsWith("uploads/")
                || photoUrl.startsWith("/elif/uploads/");
    }

    private boolean sameText(String first, String second) {
        if (first == null) {
            return second == null;
        }
        return first.equals(second);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<Long> sanitizePetIds(List<Long> petIds) {
        if (petIds == null || petIds.isEmpty()) {
            throw new IllegalArgumentException("At least one pet id is required");
        }

        List<Long> sanitized = petIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        if (sanitized.isEmpty()) {
            throw new IllegalArgumentException("No valid pet ids were provided");
        }

        return sanitized;
    }

    public static String formatAge(Integer ageInMonths) {
        if (ageInMonths == null || ageInMonths < 0) {
            return "Unknown";
        }
        if (ageInMonths == 0) {
            return "Newborn";
        }
        if (ageInMonths < 12) {
            return ageInMonths + " month" + (ageInMonths > 1 ? "s" : "");
        }
        int years = ageInMonths / 12;
        int months = ageInMonths % 12;
        if (months == 0) {
            return years + " year" + (years > 1 ? "s" : "");
        }
        return years + " year" + (years > 1 ? "s" : "") + " " + months + " month" + (months > 1 ? "s" : "");
    }

    // ── Calorie suggestion ──────────────────────────────────────────────────

    @Override
    public PetCalorieSuggestionResponseDTO suggestCaloriesForPet(Long userId, Long petId,
                                                                  PetActivityLevel activityLevel,
                                                                  PetNutritionGoal goal) {
        PetProfile pet = findMyPetById(userId, petId);
        PetActivityLevel effectiveActivity = activityLevel != null ? activityLevel : PetActivityLevel.MODERATE;
        PetNutritionGoal effectiveGoal = goal != null ? goal : PetNutritionGoal.MAINTAIN;

        double weight = pet.getWeight() != null ? Math.max(0.5, pet.getWeight().doubleValue()) : 10.0;
        int rer = (int) Math.round(70 * Math.pow(weight, 0.75));
        int suggested = estimateDailyCaloriesWithContext(pet, effectiveActivity, effectiveGoal);

        String rationale = buildCalorieRationale(pet, effectiveActivity, effectiveGoal, rer, suggested);

        return PetCalorieSuggestionResponseDTO.builder()
                .suggestedDailyCalories(suggested)
                .restingEnergyRequirement(rer)
                .activityLevel(effectiveActivity)
                .goal(effectiveGoal)
                .rationale(rationale)
                .build();
    }

    private String buildCalorieRationale(PetProfile pet, PetActivityLevel activity,
                                          PetNutritionGoal goal, int rer, int suggested) {
        StringBuilder sb = new StringBuilder();
        sb.append("RER=").append(rer).append(" kcal");
        sb.append(", activity=").append(activity.name().toLowerCase());
        sb.append(", goal=").append(goal.name().toLowerCase().replace('_', ' '));
        Integer ageMonths = pet.calculateAgeInMonths();
        if (ageMonths != null && ageMonths < 12) sb.append(", age adjustment: puppy/kitten (+50%)");
        else if (ageMonths != null && ageMonths > 84) sb.append(", age adjustment: senior (-20%)");
        sb.append(" → ").append(suggested).append(" kcal/day");
        return sb.toString();
    }

    // ── Weight log ──────────────────────────────────────────────────────────

    @Override
    public List<PetWeightLogResponseDTO> getMyPetWeightLogs(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        List<PetWeightLog> logs = petWeightLogRepository.findByPetIdOrderByLoggedDateDesc(pet.getId());
        java.math.BigDecimal prev = null;
        List<PetWeightLogResponseDTO> result = new ArrayList<>();
        // Iterate oldest-first to compute deltas, then reverse
        List<PetWeightLog> ascending = new ArrayList<>(logs);
        java.util.Collections.reverse(ascending);
        java.math.BigDecimal previousWeight = null;
        List<PetWeightLogResponseDTO> ascResult = new ArrayList<>();
        for (PetWeightLog log : ascending) {
            java.math.BigDecimal change = previousWeight != null ? log.getWeightKg().subtract(previousWeight) : null;
            ascResult.add(PetWeightLogResponseDTO.builder()
                    .id(log.getId())
                    .petId(pet.getId())
                    .loggedDate(log.getLoggedDate())
                    .weightKg(log.getWeightKg())
                    .changeKg(change)
                    .note(log.getNote())
                    .createdAt(log.getCreatedAt())
                    .build());
            previousWeight = log.getWeightKg();
        }
        java.util.Collections.reverse(ascResult);
        return ascResult;
    }

    @Override
    public PetWeightLog createMyPetWeightLog(Long userId, Long petId, PetWeightLogRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetWeightLog log = PetWeightLog.builder()
                .pet(pet)
                .loggedDate(request.getLoggedDate())
                .weightKg(request.getWeightKg())
                .note(normalize(request.getNote()))
                .build();
        return petWeightLogRepository.save(log);
    }

    @Override
    public void deleteMyPetWeightLog(Long userId, Long petId, Long logId) {
        findMyPetById(userId, petId);
        PetWeightLog log = petWeightLogRepository.findByIdAndPetId(logId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Weight log not found for this pet"));
        petWeightLogRepository.delete(log);
    }

    // ── Water log ───────────────────────────────────────────────────────────

    @Override
    public List<PetWaterLog> getMyPetWaterLogs(Long userId, Long petId, LocalDate date) {
        PetProfile pet = findMyPetById(userId, petId);
        LocalDate effectiveDate = date != null ? date : LocalDate.now();
        return petWaterLogRepository.findByPetIdAndLoggedDateOrderByCreatedAtDesc(pet.getId(), effectiveDate);
    }

    @Override
    public PetWaterLog createMyPetWaterLog(Long userId, Long petId, PetWaterLogRequestDTO request) {
        PetProfile pet = findMyPetById(userId, petId);
        PetWaterLog log = PetWaterLog.builder()
                .pet(pet)
                .loggedDate(request.getLoggedDate())
                .amountMl(request.getAmountMl())
                .note(normalize(request.getNote()))
                .build();
        return petWaterLogRepository.save(log);
    }

    @Override
    public void deleteMyPetWaterLog(Long userId, Long petId, Long logId) {
        findMyPetById(userId, petId);
        PetWaterLog log = petWaterLogRepository.findByIdAndPetId(logId, petId)
                .orElseThrow(() -> new IllegalArgumentException("Water log not found for this pet"));
        petWaterLogRepository.delete(log);
    }

    @Override
    public PetWaterSummaryResponseDTO getMyPetWaterSummary(Long userId, Long petId) {
        PetProfile pet = findMyPetById(userId, petId);
        LocalDate today = LocalDate.now();
        int todayMl = petWaterLogRepository.sumAmountMlByPetIdAndDate(pet.getId(), today);
        int targetMl = estimateDailyWaterMl(pet);
        int remaining = Math.max(0, targetMl - todayMl);
        int adherence = targetMl > 0 ? (int) Math.min(100, Math.round((todayMl * 100.0) / targetMl)) : 0;
        return PetWaterSummaryResponseDTO.builder()
                .todayIntakeMl(todayMl)
                .dailyTargetMl(targetMl)
                .remainingMl(remaining)
                .adherencePercent(adherence)
                .build();
    }
}
