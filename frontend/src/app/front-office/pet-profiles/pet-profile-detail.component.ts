import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import {
  PetActivityLevel,
  PetCareTask,
  PetCareTaskPayload,
  PetFeedingLog,
  PetFeedingLogPayload,
  PetFeedingStatus,
  PetGender,
  PetHealthRecord,
  PetHealthRecordPayload,
  PetNutritionGoal,
  PetNutritionInsights,
  PetNutritionProfile,
  PetNutritionProfilePayload,
  PetNutritionSummary,
  PetProfile,
  PetProfilePayload,
  PetSpecies,
  PetTaskRecurrence,
  PetTaskStatus,
  PetTaskUrgency
} from '../../shared/models/pet-profile.model';
import { PetProfileService } from '../../shared/services/pet-profile.service';
import { PetHealthPdfService } from './services/pet-health-pdf.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

interface PetTaskItem {
  id: number;
  title: string;
  category: string;
  urgency: PetTaskUrgency;
  status: PetTaskStatus;
  dueDate: string | null;
  notes: string | null;
  recurrence: PetTaskRecurrence;
  createdAt: string;
  updatedAt: string;
}

interface HealthReminderItem {
  recordId: number;
  visitType: string;
  nextVisitDate: string;
  daysUntil: number;
}

type TaskBoardFilter = 'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'CRITICAL' | 'COMPLETED';
type HealthViewFilter = 'ALL' | 'UPCOMING' | 'OVERDUE' | 'WITH_DIAGNOSIS' | 'THIS_YEAR';
type FeedingStatusFilter = 'ALL' | 'GIVEN' | 'PARTIAL' | 'SKIPPED';

interface FeedingTemplate {
  label: string;
  mealLabel: string;
  foodName: string;
  portionGrams: number;
  caloriesPer100g: number;
  status: PetFeedingStatus;
}

@Component({
  selector: 'app-pet-profile-detail',
  templateUrl: './pet-profile-detail.component.html',
  styleUrl: './pet-profile-detail.component.css'
})
export class PetProfileDetailComponent implements OnInit {
  readonly speciesOptions: PetSpecies[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'FISH', 'REPTILE', 'OTHER'];
  readonly genderOptions: PetGender[] = ['MALE', 'FEMALE', 'UNKNOWN'];
  readonly bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'];
  readonly yesNoUnknownOptions = ['YES', 'NO', 'UNKNOWN'];
  readonly taskStatusColumns: Array<{ key: PetTaskStatus; title: string; subtitle: string; icon: string }> = [
    { key: 'NOW', title: 'Do Now', subtitle: 'Urgent care actions', icon: 'fa-bolt' },
    { key: 'NEXT', title: 'Planned', subtitle: 'Upcoming routine tasks', icon: 'fa-calendar-check' },
    { key: 'DONE', title: 'Completed', subtitle: 'Finished this cycle', icon: 'fa-circle-check' }
  ];
  readonly taskUrgencyOptions: PetTaskUrgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly taskRecurrenceOptions: PetTaskRecurrence[] = ['NONE', 'DAILY', 'WEEKLY'];
  readonly taskCategoryOptions = [
    'Feeding',
    'Litter Cleaning',
    'Walk',
    'Grooming',
    'Medication',
    'Playtime',
    'Vet Follow-up',
    'Training',
    'Hydration',
    'Other'
  ];
  readonly taskBoardFilters: Array<{ key: TaskBoardFilter; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'DUE_TODAY', label: 'Due Today' },
    { key: 'CRITICAL', label: 'Critical' },
    { key: 'COMPLETED', label: 'Completed' }
  ];
  readonly healthViewFilters: Array<{ key: HealthViewFilter; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'UPCOMING', label: 'Upcoming' },
    { key: 'OVERDUE', label: 'Overdue' },
    { key: 'WITH_DIAGNOSIS', label: 'Diagnosis' },
    { key: 'THIS_YEAR', label: 'This Year' }
  ];
  readonly nutritionGoalOptions: PetNutritionGoal[] = ['WEIGHT_LOSS', 'MAINTAIN', 'WEIGHT_GAIN', 'MEDICAL_DIET'];
  readonly activityLevelOptions: PetActivityLevel[] = ['LOW', 'MODERATE', 'HIGH'];
  readonly feedingStatusOptions: PetFeedingStatus[] = ['GIVEN', 'PARTIAL', 'SKIPPED'];
  readonly feedingTemplates: FeedingTemplate[] = [
    {
      label: 'Light Breakfast',
      mealLabel: 'Breakfast',
      foodName: 'Lean protein + vegetables',
      portionGrams: 120,
      caloriesPer100g: 105,
      status: 'GIVEN'
    },
    {
      label: 'Balanced Lunch',
      mealLabel: 'Lunch',
      foodName: 'Balanced kibble meal',
      portionGrams: 140,
      caloriesPer100g: 130,
      status: 'GIVEN'
    },
    {
      label: 'Recovery Meal',
      mealLabel: 'Recovery',
      foodName: 'Prescription recovery diet',
      portionGrams: 100,
      caloriesPer100g: 160,
      status: 'GIVEN'
    },
    {
      label: 'Evening Light',
      mealLabel: 'Dinner',
      foodName: 'Hydration-rich wet food',
      portionGrams: 110,
      caloriesPer100g: 115,
      status: 'PARTIAL'
    }
  ];

  pet: PetProfile | null = null;
  loading = false;
  saving = false;
  deleting = false;
  formOpen = false;
  submitAttempted = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  uploadingPhoto = false;
  isDragActive = false;
  error = '';
  success = '';
  loadingHealth = false;
  savingHealth = false;
  deletingHealthId: number | null = null;
  healthRecords: PetHealthRecord[] = [];
  petTasks: PetTaskItem[] = [];
  generatingPdf = false;
  healthFormOpen = false;
  taskFormOpen = false;
  taskSubmitAttempted = false;
  savingTask = false;
  activeDropColumn: PetTaskStatus | null = null;
  shakingTaskIds: Set<number> = new Set();
  editingHealthRecordId: number | null = null;
  editingTaskId: number | null = null;
  healthSubmitAttempted = false;
  healthFormMessage = '';
  loadingNutrition = false;
  savingNutrition = false;
  savingFeedingLog = false;
  nutritionFormSubmitted = false;
  feedingFormSubmitted = false;
  nutritionMessage = '';
  nutritionApiUnavailable = false;
  hasRealNutritionProfile = false;
  showNutritionSetup = false;
  nutritionRecommendationRefreshKey = 0;
  loadingNutritionInsights = false;
  editingFeedingLogId: number | null = null;
  expandedFeedingLogId: number | null = null;
  nutritionSetupModalOpen = false;
  feedingLogModalOpen = false;
  healthHistoryModalOpen = false;
  nutritionDaysWindow = 14;
  readonly nutritionWindowOptions = [7, 14, 30, 60];
  nutritionLogFromDate = '';
  nutritionLogToDate = '';
  activeFeedingStatusFilter: FeedingStatusFilter = 'ALL';
  nutritionProfile: PetNutritionProfile | null = null;
  feedingLogs: PetFeedingLog[] = [];
  nutritionSummary: PetNutritionSummary | null = null;
  nutritionInsights: PetNutritionInsights | null = null;
  animatedNutritionSummary = {
    todayCalories: 0,
    remainingCalories: 0,
    mealsLoggedToday: 0,
    adherencePercent: 0
  };
  animatedNutritionInsights = {
    averageDailyCalories: 0,
    calorieTargetDelta: 0,
    streakDays: 0,
    completionRatePercent: 0
  };
  activeTaskFilter: TaskBoardFilter = 'ALL';
  taskSearchTerm = '';
  activeHealthFilter: HealthViewFilter = 'ALL';
  healthSearchTerm = '';
  private nutritionAnimationToken = 0;

  activeTab: 'overview' | 'tasks' | 'nutrition' | 'health' = 'overview';

  setActiveTab(tab: 'overview' | 'tasks' | 'nutrition' | 'health'): void {
    this.activeTab = tab;
  }

  petForm: FormGroup;
  healthForm: FormGroup;
  taskForm: FormGroup;
  nutritionProfileForm: FormGroup;
  feedingLogForm: FormGroup;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly petProfileService: PetProfileService,
    private readonly confirmDialogService: ConfirmDialogService,
    @Inject(PetHealthPdfService) private readonly petHealthPdfService: PetHealthPdfService
  ) {
    this.petForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s]+$/)]], 
      weight: [null, [Validators.min(0.01)]],
      species: ['DOG', [Validators.required]],
      breed: ['', [Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      dateOfBirth: ['', [Validators.required, this.pastOrTodayDateValidator()]],
      gender: ['UNKNOWN', [Validators.required]],
      photoUrl: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(500)]]
    });

    this.healthForm = this.fb.group({
      recordDate: ['', [Validators.required, this.pastOrTodayDateValidator()]],
      visitType: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(80)]],
      veterinarian: ['', [Validators.maxLength(120)]],
      clinicName: ['', [Validators.maxLength(120)]],
      bloodType: ['UNKNOWN', [Validators.required]],
      spayedNeutered: ['UNKNOWN', [Validators.required]],
      allergies: ['', [Validators.maxLength(1000)]],
      chronicConditions: ['', [Validators.maxLength(1000)]],
      previousOperations: ['', [Validators.maxLength(1000)]],
      vaccinationHistory: ['', [Validators.maxLength(1000)]],
      specialDiet: ['', [Validators.maxLength(500)]],
      parasitePrevention: ['', [Validators.maxLength(500)]],
      emergencyInstructions: ['', [Validators.maxLength(1000)]],
      diagnosis: ['', [Validators.maxLength(255)]],
      treatment: ['', [Validators.maxLength(500)]],
      medications: ['', [Validators.maxLength(500)]],
      notes: ['', [Validators.maxLength(1000)]],
      nextVisitDate: ['']
    }, { validators: this.nextVisitDateValidator() });

    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(90)]],
      category: ['Feeding', [Validators.required]],
      urgency: ['HIGH', [Validators.required]],
      status: ['NOW', [Validators.required]],
      dueDate: [''],
      recurrence: ['DAILY', [Validators.required]],
      notes: ['', [Validators.maxLength(260)]]
    }, { validators: this.taskDueDateValidator() });

    this.nutritionProfileForm = this.fb.group({
      goal: ['MAINTAIN', [Validators.required]],
      activityLevel: ['MODERATE', [Validators.required]],
      targetWeightKg: [null, [Validators.min(0.1)]],
      dailyCalorieTarget: [650, [Validators.required, Validators.min(50), Validators.max(5000)]],
      mealsPerDay: [2, [Validators.required, Validators.min(1), Validators.max(8)]],
      foodPreference: ['', [Validators.maxLength(500)]],
      allergies: ['', [Validators.maxLength(500)]],
      forbiddenIngredients: ['', [Validators.maxLength(500)]]
    });

    this.feedingLogForm = this.fb.group({
      fedAt: [this.nowDateTimeInput(), [Validators.required]],
      mealLabel: ['', [Validators.maxLength(60)]],
      foodName: ['', [Validators.required, Validators.maxLength(120)]],
      portionGrams: [80, [Validators.required, Validators.min(1), Validators.max(3000)]],
      caloriesActual: [250, [Validators.required, Validators.min(1), Validators.max(5000)]],
      status: ['GIVEN', [Validators.required]],
      note: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadPet();
  }

  loadPet(): void {
    const userId = this.getCurrentUserId();
    const petId = Number(this.route.snapshot.paramMap.get('id'));
    if (!userId || !petId) {
      this.error = 'Invalid pet profile link.';
      return;
    }

    this.loading = true;
    this.loadingHealth = true;
    this.loadingNutrition = true;
    this.loadingNutritionInsights = true;
    this.error = '';
    this.success = '';
    this.nutritionMessage = '';
    this.nutritionApiUnavailable = false;
    forkJoin({
      pet: this.petProfileService.getMyPetById(userId, petId),
      history: this.petProfileService.getMyPetHealthHistory(userId, petId),
      nutritionProfile: this.petProfileService.getMyPetNutritionProfile(userId, petId).pipe(
        catchError((err) => {
          this.flagNutritionApiUnavailable(err);
          if (this.isNotFoundApiError(err)) {
            return of(null as PetNutritionProfile | null);
          }
          return of(this.buildFallbackNutritionProfile(petId));
        })
      ),
      feedingLogs: this.petProfileService.getMyPetFeedingLogs(userId, petId).pipe(
        catchError((err) => {
          this.flagNutritionApiUnavailable(err);
          return of([] as PetFeedingLog[]);
        })
      ),
      nutritionSummary: this.petProfileService.getMyPetNutritionSummary(userId, petId).pipe(
        catchError((err) => {
          this.flagNutritionApiUnavailable(err);
          return of(this.buildFallbackNutritionSummary());
        })
      ),
      nutritionInsights: this.petProfileService.getMyPetNutritionInsights(userId, petId, this.nutritionDaysWindow).pipe(
        catchError((err) => {
          this.flagNutritionApiUnavailable(err);
          return of(this.buildFallbackNutritionInsights(this.nutritionProfile));
        })
      )
    }).subscribe({
      next: ({ pet, history, nutritionProfile, feedingLogs, nutritionSummary, nutritionInsights }) => {
        this.pet = pet;
        this.healthRecords = history;
        this.nutritionProfile = nutritionProfile;
        this.hasRealNutritionProfile = !!nutritionProfile && nutritionProfile.id !== null;
        this.showNutritionSetup = !this.hasRealNutritionProfile;
        this.feedingLogs = feedingLogs;
        this.nutritionSummary = nutritionSummary;
        this.nutritionInsights = nutritionInsights;
        this.startNutritionKpiAnimations();
        if (nutritionProfile) {
          this.patchNutritionForm(nutritionProfile);
        }
        if (this.nutritionApiUnavailable) {
          this.nutritionMessage = 'Nutrition endpoints are unavailable (404). Restart backend with latest code to enable this module.';
        }
        this.loadTasksForPet(userId, pet.id);
        this.loading = false;
        this.loadingHealth = false;
        this.loadingNutrition = false;
        this.loadingNutritionInsights = false;
      },
      error: (err) => {
        this.error = this.extractError(err, 'Unable to load this pet profile.');
        this.loading = false;
        this.loadingHealth = false;
        this.loadingNutrition = false;
        this.loadingNutritionInsights = false;
      }
    });
  }

  get visibleFeedingLogs(): PetFeedingLog[] {
    if (this.activeFeedingStatusFilter === 'ALL') {
      return this.feedingLogs;
    }
    return this.feedingLogs.filter((item) => item.status === this.activeFeedingStatusFilter);
  }

  get nutritionTrendMaxCalories(): number {
    const values = (this.nutritionInsights?.calorieTrend ?? []).map((point) => Math.max(point.calories, point.target));
    return Math.max(1, ...values, this.nutritionSummary?.dailyCalorieTarget ?? 1);
  }

  get nutritionProgressPercent(): number {
    const target = this.nutritionSummary?.dailyCalorieTarget ?? 0;
    const current = this.nutritionSummary?.todayCalories ?? 0;
    if (target <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((current / target) * 100));
  }

  get nutritionProgressLabel(): string {
    const target = this.nutritionSummary?.dailyCalorieTarget ?? 0;
    const current = this.nutritionSummary?.todayCalories ?? 0;
    if (target <= 0) {
      return 'No target configured';
    }
    if (current < target * 0.8) {
      return 'Below target range';
    }
    if (current <= target * 1.1) {
      return 'On target';
    }
    return 'Above target range';
  }

  get nutritionProgressTone(): 'good' | 'warn' | 'danger' {
    const delta = this.nutritionInsights?.calorieTargetDelta ?? 0;
    if (Math.abs(delta) <= 75) {
      return 'good';
    }
    if (Math.abs(delta) <= 180) {
      return 'warn';
    }
    return 'danger';
  }

  setNutritionWindow(days: number): void {
    this.nutritionDaysWindow = days;
    this.refreshNutritionInsights();
  }

  setFeedingStatusFilter(filter: FeedingStatusFilter): void {
    this.activeFeedingStatusFilter = filter;
  }

  applyFeedingTemplate(template: FeedingTemplate): void {
    const calories = Math.round((template.portionGrams * template.caloriesPer100g) / 100);
    this.feedingLogForm.patchValue({
      fedAt: this.nowDateTimeInput(),
      mealLabel: template.mealLabel,
      foodName: template.foodName,
      portionGrams: template.portionGrams,
      caloriesActual: calories,
      status: template.status,
      note: ''
    });
    this.nutritionMessage = `${template.label} template applied.`;
  }

  toggleFeedingLogDetails(logId: number): void {
    this.expandedFeedingLogId = this.expandedFeedingLogId === logId ? null : logId;
  }

  isFeedingLogExpanded(logId: number): boolean {
    return this.expandedFeedingLogId === logId;
  }

  applyFeedingLogRangeFilter(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    this.petProfileService.getMyPetFeedingLogs(
      userId,
      this.pet.id,
      this.nutritionLogFromDate || undefined,
      this.nutritionLogToDate || undefined
    ).subscribe({
      next: (logs) => {
        this.feedingLogs = logs;
      },
      error: (err) => {
        this.nutritionMessage = this.extractError(err, 'Unable to filter feeding logs by date range.');
      }
    });
  }

  clearFeedingLogRangeFilter(): void {
    this.nutritionLogFromDate = '';
    this.nutritionLogToDate = '';
    this.refreshFeedingLogs();
  }

  editFeedingLog(log: PetFeedingLog): void {
    this.editingFeedingLogId = log.id;
    this.feedingLogModalOpen = true;
    this.feedingLogForm.patchValue({
      fedAt: this.dateTimeLocalFromIso(log.fedAt),
      mealLabel: log.mealLabel ?? '',
      foodName: log.foodName,
      portionGrams: log.portionGrams,
      caloriesActual: log.caloriesActual,
      status: log.status,
      note: log.note ?? ''
    });
    this.nutritionMessage = 'Editing feeding log. Save to update.';
  }

  cancelFeedingLogEdit(): void {
    this.editingFeedingLogId = null;
    this.expandedFeedingLogId = null;
    this.feedingLogModalOpen = false;
    this.feedingLogForm.reset({
      fedAt: this.nowDateTimeInput(),
      mealLabel: '',
      foodName: '',
      portionGrams: 80,
      caloriesActual: 250,
      status: 'GIVEN',
      note: ''
    });
  }

  async deleteFeedingLog(log: PetFeedingLog): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete feeding log for ${log.foodName}?`,
      {
        title: 'Delete feeding log',
        confirmText: 'Delete log',
        cancelText: 'Keep log',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.petProfileService.deleteMyPetFeedingLog(userId, this.pet.id, log.id).subscribe({
      next: () => {
        this.feedingLogs = this.feedingLogs.filter((item) => item.id !== log.id);
        this.nutritionMessage = 'Feeding log deleted.';
        this.refreshNutritionSummary();
        this.refreshNutritionInsights();
      },
      error: (err) => {
        this.nutritionMessage = this.extractError(err, 'Unable to delete feeding log.');
      }
    });
  }

  get nutritionAdherenceTone(): 'good' | 'warn' | 'danger' {
    const adherence = this.nutritionSummary?.adherencePercent ?? 0;
    if (adherence >= 85) {
      return 'good';
    }
    if (adherence >= 60) {
      return 'warn';
    }
    return 'danger';
  }

  get isNutritionProfileInvalid(): boolean {
    return this.nutritionProfileForm.invalid && this.nutritionFormSubmitted;
  }

  get isFeedingLogInvalid(): boolean {
    return this.feedingLogForm.invalid && this.feedingFormSubmitted;
  }

  saveNutritionProfile(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    this.nutritionFormSubmitted = true;
    if (this.nutritionProfileForm.invalid) {
      this.nutritionProfileForm.markAllAsTouched();
      return;
    }

    this.savingNutrition = true;
    this.nutritionMessage = '';
    this.error = '';

    this.petProfileService.upsertMyPetNutritionProfile(userId, this.pet.id, this.toNutritionProfilePayload()).subscribe({
      next: (profile) => {
        this.nutritionProfile = profile;
        this.hasRealNutritionProfile = true;
        this.showNutritionSetup = false;
        this.nutritionSetupModalOpen = false;
        this.patchNutritionForm(profile);
        this.savingNutrition = false;
        this.nutritionFormSubmitted = false;
        this.nutritionMessage = 'Nutrition plan updated successfully.';
        this.nutritionRecommendationRefreshKey++;
        this.refreshNutritionSummary();
        this.refreshNutritionInsights();
      },
      error: (err) => {
        this.savingNutrition = false;
        this.nutritionMessage = this.isNotFoundApiError(err)
          ? 'Nutrition endpoint not found. Restart backend with latest code, then retry.'
          : this.extractError(err, 'Unable to update nutrition plan.');
      }
    });
  }

  saveNutritionProfileFromSetup(payload: PetNutritionProfilePayload): void {
    this.nutritionProfileForm.patchValue({
      goal: payload.goal,
      activityLevel: payload.activityLevel,
      targetWeightKg: payload.targetWeightKg,
      dailyCalorieTarget: payload.dailyCalorieTarget,
      mealsPerDay: payload.mealsPerDay,
      foodPreference: payload.foodPreference ?? '',
      allergies: payload.allergies ?? '',
      forbiddenIngredients: payload.forbiddenIngredients ?? ''
    });
    this.saveNutritionProfile();
  }

  openNutritionSetup(): void {
    this.showNutritionSetup = true;
    this.nutritionSetupModalOpen = true;
    this.nutritionMessage = '';
  }

  cancelNutritionSetup(): void {
    this.nutritionSetupModalOpen = false;
    this.showNutritionSetup = !this.hasRealNutritionProfile;
  }

  openFeedingLogModal(): void {
    this.feedingLogModalOpen = true;
    this.feedingFormSubmitted = false;
    this.nutritionMessage = '';
    if (!this.editingFeedingLogId) {
      this.feedingLogForm.reset({
        fedAt: this.nowDateTimeInput(),
        mealLabel: '',
        foodName: '',
        portionGrams: 80,
        caloriesActual: 250,
        status: 'GIVEN',
        note: ''
      });
    }
  }

  openHealthHistoryModal(): void {
    this.healthHistoryModalOpen = true;
  }

  closeHealthHistoryModal(): void {
    this.healthHistoryModalOpen = false;
  }

  addFeedingLog(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    this.feedingFormSubmitted = true;
    if (this.feedingLogForm.invalid) {
      this.feedingLogForm.markAllAsTouched();
      return;
    }

    this.savingFeedingLog = true;
    this.nutritionMessage = '';
    this.error = '';

    const payload = this.toFeedingLogPayload();
    const request$ = this.editingFeedingLogId
      ? this.petProfileService.updateMyPetFeedingLog(userId, this.pet.id, this.editingFeedingLogId, payload)
      : this.petProfileService.createMyPetFeedingLog(userId, this.pet.id, payload);

    request$.subscribe({
      next: (log) => {
        const isEdit = this.editingFeedingLogId !== null;
        if (isEdit) {
          this.feedingLogs = this.feedingLogs.map((item) => item.id === log.id ? log : item);
        } else {
          this.feedingLogs = [log, ...this.feedingLogs];
        }
        this.cancelFeedingLogEdit();
        this.savingFeedingLog = false;
        this.feedingFormSubmitted = false;
        this.nutritionMessage = isEdit ? 'Feeding log updated.' : 'Feeding log added.';
        this.refreshNutritionSummary();
        this.refreshNutritionInsights();
      },
      error: (err) => {
        this.savingFeedingLog = false;
        this.nutritionMessage = this.isNotFoundApiError(err)
          ? 'Feeding logs endpoint not found. Restart backend with latest code, then retry.'
          : this.extractError(err, 'Unable to add feeding log.');
      }
    });
  }

  openHealthForm(record?: PetHealthRecord): void {
    this.healthFormOpen = true;
    this.healthSubmitAttempted = false;
    this.healthFormMessage = '';
    this.success = '';
    this.error = '';

    if (!record) {
      this.editingHealthRecordId = null;
      this.healthForm.reset({
        recordDate: this.todayDateInput(),
        visitType: '',
        veterinarian: '',
        clinicName: '',
        bloodType: 'UNKNOWN',
        spayedNeutered: 'UNKNOWN',
        allergies: '',
        chronicConditions: '',
        previousOperations: '',
        vaccinationHistory: '',
        specialDiet: '',
        parasitePrevention: '',
        emergencyInstructions: '',
        diagnosis: '',
        treatment: '',
        medications: '',
        notes: '',
        nextVisitDate: ''
      });
      return;
    }

    this.editingHealthRecordId = record.id;
    this.healthForm.patchValue({
      recordDate: record.recordDate,
      visitType: record.visitType,
      veterinarian: record.veterinarian ?? '',
      clinicName: record.clinicName ?? '',
      bloodType: record.bloodType ?? 'UNKNOWN',
      spayedNeutered: record.spayedNeutered ?? 'UNKNOWN',
      allergies: record.allergies ?? '',
      chronicConditions: record.chronicConditions ?? '',
      previousOperations: record.previousOperations ?? '',
      vaccinationHistory: record.vaccinationHistory ?? '',
      specialDiet: record.specialDiet ?? '',
      parasitePrevention: record.parasitePrevention ?? '',
      emergencyInstructions: record.emergencyInstructions ?? '',
      diagnosis: record.diagnosis ?? '',
      treatment: record.treatment ?? '',
      medications: record.medications ?? '',
      notes: record.notes ?? '',
      nextVisitDate: record.nextVisitDate ?? ''
    });
  }

  cancelHealthForm(): void {
    this.healthFormOpen = false;
    this.editingHealthRecordId = null;
    this.healthSubmitAttempted = false;
    this.savingHealth = false;
    this.healthFormMessage = '';
  }

  saveHealthRecord(): void {
    this.healthSubmitAttempted = true;
    const userId = this.getCurrentUserId();
    if (!userId || !this.pet) {
      return;
    }
    if (this.healthForm.invalid) {
      this.healthForm.markAllAsTouched();
      this.healthFormMessage = 'Please fix the highlighted fields before updating the record.';
      return;
    }

    this.savingHealth = true;
    this.healthFormMessage = '';
    this.error = '';
    this.success = '';

    const payload = this.toHealthPayload();
    const editingRecordId = this.editingHealthRecordId;
    const isEdit = editingRecordId !== null;
    const request$ = isEdit
      ? this.petProfileService.updateMyPetHealthRecord(userId, this.pet.id, editingRecordId, payload)
      : this.petProfileService.createMyPetHealthRecord(userId, this.pet.id, payload);

    request$.subscribe({
      next: (savedRecord) => {
        if (this.editingHealthRecordId) {
          this.healthRecords = this.healthRecords.map((record) => record.id === savedRecord.id ? savedRecord : record);
        } else {
          this.healthRecords = [savedRecord, ...this.healthRecords];
        }
        this.healthRecords = this.sortHealthRecords(this.healthRecords);
        this.savingHealth = false;
        this.healthFormOpen = false;
        this.editingHealthRecordId = null;
        this.healthSubmitAttempted = false;
        this.healthFormMessage = '';
        this.success = isEdit
          ? 'Health record updated successfully.'
          : 'Health record added successfully.';
      },
      error: (err) => {
        this.savingHealth = false;
        const message = this.extractError(err, 'Unable to save health record.');
        this.healthFormMessage = message;
        this.error = message;
      }
    });
  }

  async deleteHealthRecord(record: PetHealthRecord): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId || !this.pet) {
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete this ${record.visitType.toLowerCase()} record?`,
      {
        title: 'Delete health record',
        confirmText: 'Delete record',
        cancelText: 'Keep record',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.deletingHealthId = record.id;
    this.error = '';
    this.success = '';

    this.petProfileService.deleteMyPetHealthRecord(userId, this.pet.id, record.id).subscribe({
      next: () => {
        this.healthRecords = this.healthRecords.filter((item) => item.id !== record.id);
        this.deletingHealthId = null;
        this.success = 'Health record removed successfully.';
      },
      error: (err) => {
        this.deletingHealthId = null;
        this.error = this.extractError(err, 'Unable to delete health record.');
      }
    });
  }

  async downloadHealthCardPdf(): Promise<void> {
    if (!this.pet) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Please sign in to download the health card.';
      return;
    }

    this.generatingPdf = true;
    this.error = '';
    try {
      await this.petHealthPdfService.generateHealthCardPdf(this.pet, this.healthRecords, {
        fullName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Pet Owner'
      });
    } catch {
      this.error = 'Unable to generate health card PDF.';
    } finally {
      this.generatingPdf = false;
    }
  }

  openEdit(): void {
    if (!this.pet) {
      return;
    }
    this.formOpen = true;
    this.submitAttempted = false;
    this.success = '';
    this.petForm.patchValue({
      name: this.pet.name,
      weight: this.pet.weight,
      species: this.pet.species,
      breed: this.pet.breed ?? '',
      dateOfBirth: this.pet.dateOfBirth ?? '',
      gender: this.pet.gender,
      photoUrl: this.toHttpUrlOrEmpty(this.pet.photoUrl)
    });
    this.photoPreviewUrl = this.pet.photoUrl ?? null;
    this.clearSelectedFile();
  }

  cancelEdit(): void {
    this.formOpen = false;
    this.submitAttempted = false;
    this.clearSelectedPhoto();
    this.uploadingPhoto = false;
    this.success = '';
  }

  saveEdit(): void {
    this.submitAttempted = true;
    const userId = this.getCurrentUserId();
    if (!userId || !this.pet) {
      return;
    }
    if (this.petForm.invalid) {
      this.petForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.uploadingPhoto = false;
    this.error = '';
    this.success = '';

    this.petProfileService.updateMyPet(userId, this.pet.id, this.toPayload()).pipe(
      switchMap((updatedPet) => {
        if (!this.selectedPhotoFile) {
          return of(updatedPet);
        }
        this.uploadingPhoto = true;
        return this.petProfileService.uploadMyPetPhoto(userId, updatedPet.id, this.selectedPhotoFile);
      })
    ).subscribe({
      next: (updated) => {
        this.pet = updated;
        this.saving = false;
        this.uploadingPhoto = false;
        this.formOpen = false;
        this.submitAttempted = false;
        this.clearSelectedPhoto();
        this.success = 'Pet profile updated successfully.';
      },
      error: (err) => {
        this.saving = false;
        this.uploadingPhoto = false;
        this.error = this.extractError(err, 'Unable to update pet profile.');
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.applySelectedFile(file);
    input.value = '';
  }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  onUploadDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = true;
  }

  onUploadDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
  }

  onUploadDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.applySelectedFile(file);
      return;
    }

    const droppedUrl = (event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain') || '').trim();
    if (this.isHttpUrl(droppedUrl)) {
      this.petForm.patchValue({ photoUrl: droppedUrl });
      this.syncPhotoUrlPreview();
      this.success = 'Image URL added from drop.';
    }
  }

  onUploadPaste(event: ClipboardEvent): void {
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return;
    }

    const imageItem = Array.from(clipboard.items).find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        event.preventDefault();
        this.applySelectedFile(file);
      }
      return;
    }

    const pastedText = (clipboard.getData('text/plain') || '').trim();
    if (this.isHttpUrl(pastedText)) {
      event.preventDefault();
      this.petForm.patchValue({ photoUrl: pastedText });
      this.syncPhotoUrlPreview();
      this.success = 'Image URL pasted successfully.';
    }
  }

  removeSelectedPhoto(): void {
    this.clearSelectedPhoto();
    this.petForm.patchValue({ photoUrl: '' });
  }

  syncPhotoUrlPreview(): void {
    const url = this.toHttpUrlOrEmpty(this.petForm.get('photoUrl')?.value ?? null);
    if (url) {
      this.clearSelectedFile();
      this.photoPreviewUrl = url;
      return;
    }

    if (!this.selectedPhotoFile) {
      this.photoPreviewUrl = null;
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.petForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  hasControlError(controlName: string, errorKey: string): boolean {
    return !!this.petForm.get(controlName)?.errors?.[errorKey] && this.isInvalid(controlName);
  }

  isHealthInvalid(controlName: string): boolean {
    const control = this.healthForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  hasHealthControlError(controlName: string, errorKey: string): boolean {
    return !!this.healthForm.get(controlName)?.errors?.[errorKey] && this.isHealthInvalid(controlName);
  }

  hasHealthFormError(errorKey: string): boolean {
    return !!this.healthForm.errors?.[errorKey] && this.healthSubmitAttempted;
  }

  get latestHealthRecord(): PetHealthRecord | null {
    return this.healthRecords.length ? this.healthRecords[0] : null;
  }

  get filteredHealthRecords(): PetHealthRecord[] {
    return this.healthRecords.filter((record) => this.matchesHealthView(record));
  }

  get hasHealthViewFilters(): boolean {
    return this.activeHealthFilter !== 'ALL' || !!this.healthSearchTerm.trim();
  }

  get healthReminders(): HealthReminderItem[] {
    return this.healthRecords
      .filter((record) => !!record.nextVisitDate)
      .map((record) => {
        const nextVisitDate = record.nextVisitDate as string;
        return {
          recordId: record.id,
          visitType: record.visitType,
          nextVisitDate,
          daysUntil: this.getDateDifferenceFromToday(nextVisitDate)
        };
      })
      .filter((item) => item.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);
  }

  get hasHealthReminders(): boolean {
    return this.healthReminders.length > 0;
  }

  get urgentReminderCount(): number {
    return this.healthReminders.filter((item) => item.daysUntil <= 3).length;
  }

  get upcomingVisitCount(): number {
    return this.healthRecords.filter((record) => {
      if (!record.nextVisitDate) {
        return false;
      }
      const nextVisit = new Date(record.nextVisitDate);
      if (Number.isNaN(nextVisit.getTime())) {
        return false;
      }
      return nextVisit >= this.startOfToday();
    }).length;
  }

  get overdueFollowUpCount(): number {
    return this.healthRecords.filter((record) => {
      if (!record.nextVisitDate) {
        return false;
      }
      const nextVisit = new Date(record.nextVisitDate);
      if (Number.isNaN(nextVisit.getTime())) {
        return false;
      }
      return nextVisit < this.startOfToday();
    }).length;
  }

  get daysSinceLatestVisit(): number | null {
    if (!this.latestHealthRecord) {
      return null;
    }
    return this.getDateDifferenceInDays(this.latestHealthRecord.recordDate, this.todayDateInput());
  }

  get healthDataCompletenessScore(): number {
    const record = this.latestHealthRecord;
    if (!record) {
      return 0;
    }

    const fields = [
      record.veterinarian,
      record.clinicName,
      record.diagnosis,
      record.treatment,
      record.vaccinationHistory,
      record.parasitePrevention,
      record.allergies,
      record.emergencyInstructions
    ];
    const filled = fields.filter((value) => !!value && value.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  get preventiveCareScore(): number {
    const record = this.latestHealthRecord;
    if (!record) {
      return 0;
    }

    let score = 30;
    if (record.vaccinationHistory) {
      score += 30;
    }
    if (record.parasitePrevention) {
      score += 20;
    }
    if (record.spayedNeutered && record.spayedNeutered !== 'UNKNOWN') {
      score += 10;
    }
    if (record.specialDiet) {
      score += 10;
    }
    return Math.max(0, Math.min(100, score));
  }

  get visitRecencyScore(): number {
    const daysSinceLatest = this.daysSinceLatestVisit;
    if (daysSinceLatest === null) {
      return 0;
    }
    if (daysSinceLatest <= 30) {
      return 100;
    }
    if (daysSinceLatest <= 90) {
      return 82;
    }
    if (daysSinceLatest <= 180) {
      return 62;
    }
    if (daysSinceLatest <= 270) {
      return 42;
    }
    return 24;
  }

  get followUpAdherenceScore(): number {
    if (!this.healthRecords.length) {
      return 0;
    }

    const upcomingWeight = Math.min(1, this.upcomingVisitCount / 2) * 35;
    const overduePenalty = Math.min(40, this.overdueFollowUpCount * 15);
    const base = 65 + upcomingWeight - overduePenalty;
    return Math.max(0, Math.min(100, Math.round(base)));
  }

  get healthCardStatus(): string {
    if (!this.healthRecords.length) {
      return 'No records yet';
    }
    if (this.overdueFollowUpCount > 0) {
      return 'Follow-up overdue';
    }
    return this.upcomingVisitCount > 0 ? 'Follow-up scheduled' : 'Up to date';
  }

  get healthScore(): number {
    if (!this.healthRecords.length) {
      return 0;
    }

    const recordVolumeScore = Math.min(100, 42 + this.healthRecords.length * 8);
    const weightedScore =
      (this.visitRecencyScore * 0.3)
      + (this.followUpAdherenceScore * 0.25)
      + (this.healthDataCompletenessScore * 0.2)
      + (this.preventiveCareScore * 0.15)
      + (recordVolumeScore * 0.1);

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  get healthScoreLabel(): string {
    if (!this.healthRecords.length) {
      return 'No data';
    }
    if (this.healthScore >= 85) {
      return 'Excellent';
    }
    if (this.healthScore >= 65) {
      return 'Healthy';
    }
    if (this.healthScore >= 45) {
      return 'Watch closely';
    }
    return 'Needs attention';
  }

  get healthScoreSubtitle(): string {
    if (!this.healthRecords.length) {
      return 'Add the first health visit to activate the card.';
    }
    if (this.overdueFollowUpCount > 0) {
      return `${this.overdueFollowUpCount} follow-up visit${this.overdueFollowUpCount === 1 ? '' : 's'} overdue.`;
    }
    return this.upcomingVisitCount > 0
      ? 'A follow-up is on the calendar.'
      : 'No upcoming visit scheduled right now.';
  }

  get healthScoreDescription(): string {
    if (!this.healthRecords.length) {
      return 'The card will populate once the first veterinary record is saved.';
    }
    return `Weighted from recency (${this.visitRecencyScore}), follow-up adherence (${this.followUpAdherenceScore}), preventive care (${this.preventiveCareScore}), and data completeness (${this.healthDataCompletenessScore}).`;
  }

  get healthRecommendations(): string[] {
    if (!this.healthRecords.length) {
      return [
        'Add the first veterinary visit to initialize health insights.',
        'Record vaccination and preventive care details for better score accuracy.'
      ];
    }

    const suggestions: string[] = [];
    if (this.overdueFollowUpCount > 0) {
      suggestions.push('Schedule overdue follow-up visits as soon as possible.');
    }
    if (this.daysSinceLatestVisit !== null && this.daysSinceLatestVisit > 120) {
      suggestions.push('Log a fresh checkup to keep health tracking current.');
    }
    if (this.healthDataCompletenessScore < 60) {
      suggestions.push('Complete latest record fields: diagnosis, treatment, and emergency instructions.');
    }
    if (this.preventiveCareScore < 70) {
      suggestions.push('Update vaccination and parasite-prevention entries for stronger preventive coverage.');
    }
    if (!suggestions.length) {
      suggestions.push('Health tracking is in a strong state; keep recording visits consistently.');
    }
    return suggestions.slice(0, 3);
  }

  get healthScoreComponents(): Array<{ label: string; score: number; weight: string; width: string; tone: string }> {
    const components = [
      { label: 'Visit Recency', score: this.visitRecencyScore, weight: '30%' },
      { label: 'Follow-up Adherence', score: this.followUpAdherenceScore, weight: '25%' },
      { label: 'Data Completeness', score: this.healthDataCompletenessScore, weight: '20%' },
      { label: 'Preventive Care', score: this.preventiveCareScore, weight: '15%' },
      { label: 'Record Volume', score: Math.min(100, 42 + this.healthRecords.length * 8), weight: '10%' }
    ];

    return components.map((item) => ({
      ...item,
      width: `${Math.max(6, item.score)}%`,
      tone: item.score >= 70 ? 'good' : item.score >= 45 ? 'warn' : 'danger'
    }));
  }

  get healthMomentumLabel(): string {
    const bars = this.healthTrendBars;
    const recent = bars.slice(-3).reduce((sum, item) => sum + item.count, 0);
    const previous = bars.slice(0, 3).reduce((sum, item) => sum + item.count, 0);

    if (recent === 0 && previous === 0) {
      return 'No recent activity yet';
    }
    if (recent > previous) {
      return 'Care momentum improving';
    }
    if (recent < previous) {
      return 'Care momentum slowing';
    }
    return 'Care momentum steady';
  }

  get isHealthRiskHigh(): boolean {
    return this.healthScore < 45 || this.overdueFollowUpCount > 0;
  }

  getHealthReminderLabel(daysUntil: number): string {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`;
    }
    if (daysUntil === 0) {
      return 'Due today';
    }
    return `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  }

  getHealthReminderTone(daysUntil: number): 'danger' | 'warn' | 'good' {
    if (daysUntil < 0 || daysUntil <= 3) {
      return 'danger';
    }
    if (daysUntil <= 10) {
      return 'warn';
    }
    return 'good';
  }

  getRecordChangeHighlights(record: PetHealthRecord): string[] {
    const previous = this.getPreviousHealthRecord(record);
    if (!previous) {
      return [];
    }

    const changes: string[] = [];
    const mappings: Array<{ label: string; key: keyof PetHealthRecord }> = [
      { label: 'Diagnosis', key: 'diagnosis' },
      { label: 'Treatment', key: 'treatment' },
      { label: 'Medications', key: 'medications' },
      { label: 'Allergies', key: 'allergies' },
      { label: 'Special Diet', key: 'specialDiet' },
      { label: 'Parasite Prevention', key: 'parasitePrevention' },
      { label: 'Next Visit', key: 'nextVisitDate' }
    ];

    for (const mapping of mappings) {
      const currentValue = this.normalizeComparableValue(record[mapping.key]);
      const previousValue = this.normalizeComparableValue(previous[mapping.key]);
      if (currentValue !== previousValue) {
        changes.push(mapping.label);
      }
    }

    if (record.visitType !== previous.visitType) {
      changes.push('Visit Type');
    }

    return changes.slice(0, 4);
  }

  exportHealthInsights(): void {
    if (!this.pet) {
      return;
    }

    const payload = {
      pet: {
        id: this.pet.id,
        name: this.pet.name,
        species: this.pet.species,
        breed: this.pet.breed,
        age: this.pet.ageDisplay
      },
      generatedAt: new Date().toISOString(),
      score: {
        overall: this.healthScore,
        label: this.healthScoreLabel,
        status: this.healthCardStatus,
        momentum: this.healthMomentumLabel,
        components: this.healthScoreComponents
      },
      reminders: this.healthReminders.map((item) => ({
        visitType: item.visitType,
        nextVisitDate: item.nextVisitDate,
        label: this.getHealthReminderLabel(item.daysUntil),
        tone: this.getHealthReminderTone(item.daysUntil)
      })),
      recommendations: this.healthRecommendations,
      latestRecord: this.latestHealthRecord,
      totals: {
        records: this.healthRecords.length,
        upcoming: this.upcomingVisitCount,
        overdueFollowUps: this.overdueFollowUpCount
      }
    };

    const fileNameSafePetName = this.pet.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fileName = `${fileNameSafePetName || 'pet'}-health-insights.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.success = 'Health insights exported successfully.';
  }

  get healthRingCircumference(): number {
    return 2 * Math.PI * 46;
  }

  get healthRingDashOffset(): number {
    return this.healthRingCircumference * (1 - this.healthScore / 100);
  }

  get healthTrendBars(): Array<{ label: string; month: string; count: number; height: number; intensity: string }> {
    const buckets = new Map<string, number>();
    const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, 0);
    }

    for (const record of this.healthRecords) {
      const date = new Date(record.recordDate);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    const maxCount = Math.max(1, ...buckets.values());

    return Array.from(buckets.entries()).map(([key, count]) => {
      const [year, month] = key.split('-').map((value) => Number(value));
      const date = new Date(year, month - 1, 1);
      const label = monthFormatter.format(date);
      return {
        label,
        month: key,
        count,
        height: Math.max(18, (count / maxCount) * 100),
        intensity: this.getTrendIntensityClass(count, maxCount)
      };
    });
  }

  get visitTypeBreakdown(): Array<{ label: string; value: number; share: number; width: string }> {
    const counts = new Map<string, number>();

    for (const record of this.healthRecords) {
      const label = this.normalizeHealthLabel(record.visitType || 'Other');
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const total = Math.max(1, this.healthRecords.length);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value]) => ({
        label,
        value,
        share: Math.round((value / total) * 100),
        width: `${(value / total) * 100}%`
      }));
  }

  setHealthFilter(filter: HealthViewFilter): void {
    this.activeHealthFilter = filter;
  }

  clearHealthFilters(): void {
    this.activeHealthFilter = 'ALL';
    this.healthSearchTerm = '';
  }

  getHealthFilterCount(filter: HealthViewFilter): number {
    return this.healthRecords.filter((record) => this.matchesHealthFilter(record, filter)).length;
  }

  get healthHighlights(): Array<{ label: string; value: string; tone: string }> {
    const latestRecord = this.latestHealthRecord;
    return [
      { label: 'Status', value: this.healthCardStatus, tone: this.overdueFollowUpCount > 0 ? 'danger' : 'neutral' },
      { label: 'Score', value: `${this.healthScore}/100`, tone: this.healthScore >= 65 ? 'good' : this.healthScore >= 45 ? 'warn' : 'danger' },
      { label: 'Completeness', value: `${this.healthDataCompletenessScore}%`, tone: this.healthDataCompletenessScore >= 65 ? 'good' : this.healthDataCompletenessScore >= 40 ? 'warn' : 'danger' },
      { label: 'Last Check', value: latestRecord ? this.formatDate(latestRecord.recordDate) : 'Not available', tone: latestRecord ? 'good' : 'neutral' }
    ];
  }

  get totalOpenTasks(): number {
    return this.petTasks.filter((task) => task.status !== 'DONE').length;
  }

  get criticalTaskCount(): number {
    return this.petTasks.filter((task) => task.status !== 'DONE' && task.urgency === 'CRITICAL').length;
  }

  get dueTodayTaskCount(): number {
    const today = this.todayDateInput();
    return this.petTasks.filter((task) => task.status !== 'DONE' && task.dueDate === today).length;
  }

  get overdueTaskCount(): number {
    return this.petTasks.filter((task) => this.isTaskOverdue(task)).length;
  }

  get completedTaskCount(): number {
    return this.petTasks.filter((task) => task.status === 'DONE').length;
  }

  get nextUrgentTask(): PetTaskItem | null {
    const activeTasks = this.petTasks.filter((task) => task.status !== 'DONE');
    return activeTasks.length ? activeTasks[0] : null;
  }

  get visibleTaskCount(): number {
    return this.petTasks.filter((task) => this.matchesTaskView(task)).length;
  }

  get hasTaskViewFilters(): boolean {
    return this.activeTaskFilter !== 'ALL' || !!this.taskSearchTerm.trim();
  }

  getTaskCards(status: PetTaskStatus): PetTaskItem[] {
    return this.petTasks.filter((task) => task.status === status && this.matchesTaskView(task));
  }

  setTaskBoardFilter(filter: TaskBoardFilter): void {
    this.activeTaskFilter = filter;
  }

  clearTaskViewFilters(): void {
    this.activeTaskFilter = 'ALL';
    this.taskSearchTerm = '';
  }

  getTaskFilterCount(filter: TaskBoardFilter): number {
    return this.petTasks.filter((task) => this.matchesTaskFilter(task, filter)).length;
  }

  trackByTaskId(_: number, task: PetTaskItem): number {
    return task.id;
  }

  openTaskForm(): void {
    this.taskFormOpen = true;
    this.taskSubmitAttempted = false;
    this.savingTask = false;
    this.editingTaskId = null;
    this.error = '';
    this.success = '';
    this.taskForm.reset({
      title: '',
      category: 'Feeding',
      urgency: 'HIGH',
      status: 'NOW',
      dueDate: this.todayDateInput(),
      recurrence: 'DAILY',
      notes: ''
    });
  }

  openTaskEditor(task: PetTaskItem): void {
    this.taskFormOpen = true;
    this.taskSubmitAttempted = false;
    this.savingTask = false;
    this.editingTaskId = task.id;
    this.error = '';
    this.success = '';
    this.taskForm.reset({
      title: task.title,
      category: task.category,
      urgency: task.urgency,
      status: task.status,
      dueDate: task.dueDate ?? '',
      recurrence: task.recurrence,
      notes: task.notes ?? ''
    });
  }

  cancelTaskForm(): void {
    this.taskFormOpen = false;
    this.taskSubmitAttempted = false;
    this.savingTask = false;
    this.editingTaskId = null;
  }

  createTask(): void {
    this.taskSubmitAttempted = true;
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.savingTask = true;
    this.error = '';
    this.success = '';

    const payload = this.toTaskPayload();
    const editingTaskId = this.editingTaskId;
    const isEdit = editingTaskId !== null;
    const request$ = isEdit
      ? this.petProfileService.updateMyPetTask(userId, this.pet.id, editingTaskId, payload)
      : this.petProfileService.createMyPetTask(userId, this.pet.id, payload);

    request$.subscribe({
      next: (savedTask) => {
        const normalized = this.normalizeApiTask(savedTask);
        if (isEdit) {
          this.petTasks = this.sortTasks(this.petTasks.map((task) => task.id === normalized.id ? normalized : task));
          this.success = 'Task updated successfully.';
        } else {
          this.petTasks = this.sortTasks([...this.petTasks, normalized]);
          this.success = 'Task added to your pet board.';
        }
        this.savingTask = false;
        this.taskFormOpen = false;
        this.taskSubmitAttempted = false;
        this.editingTaskId = null;
      },
      error: (err) => {
        this.savingTask = false;
        this.error = this.extractError(err, 'Unable to save task.');
      }
    });
  }

  isTaskInvalid(controlName: string): boolean {
    const control = this.taskForm.get(controlName);
    return !!control && control.invalid && this.taskSubmitAttempted;
  }

  hasTaskControlError(controlName: string, errorKey: string): boolean {
    return !!this.taskForm.get(controlName)?.errors?.[errorKey] && this.isTaskInvalid(controlName);
  }

  hasTaskFormError(errorKey: string): boolean {
    return !!this.taskForm.errors?.[errorKey] && this.taskSubmitAttempted;
  }

  isTaskOverdue(task: PetTaskItem): boolean {
    if (task.status === 'DONE' || !task.dueDate) {
      return false;
    }
    return this.normalizeDate(task.dueDate).getTime() < this.startOfToday().getTime();
  }

  moveTask(task: PetTaskItem, status: PetTaskStatus): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId || task.status === status) {
      return;
    }

    // Prevent moving completed tasks
    if (task.status === 'DONE') {
      this.shakeCompletedTask(task);
      this.error = 'Completed tasks cannot be moved. Edit the task to reopen it.';
      return;
    }

    const updatedTask: PetTaskItem = {
      ...task,
      status,
      updatedAt: new Date().toISOString()
    };

    this.petProfileService.updateMyPetTask(userId, this.pet.id, Number(task.id), this.toTaskPayloadFromTask(updatedTask)).subscribe({
      next: (savedTask) => {
        const normalized = this.normalizeApiTask(savedTask);
        this.petTasks = this.sortTasks(this.petTasks.map((item) => item.id === normalized.id ? normalized : item));
        this.success = 'Task moved successfully.';
      },
      error: (err) => {
        this.error = this.extractError(err, 'Unable to update task.');
      }
    });
  }

  onTaskDragStart(event: DragEvent, task: PetTaskItem): void {
    // Prevent dragging completed tasks
    if (task.status === 'DONE') {
      event.preventDefault();
      this.shakeCompletedTask(task);
      return;
    }
    
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/task-id', String(task.id));
  }

  onColumnDragOver(event: DragEvent, status: PetTaskStatus): void {
    event.preventDefault();
    this.activeDropColumn = status;
  }

  onColumnDragLeave(status: PetTaskStatus): void {
    if (this.activeDropColumn === status) {
      this.activeDropColumn = null;
    }
  }

  onColumnDrop(event: DragEvent, status: PetTaskStatus): void {
    event.preventDefault();
    this.activeDropColumn = null;
    const taskId = event.dataTransfer?.getData('text/task-id') ?? '';
    if (!taskId) {
      return;
    }

    const task = this.petTasks.find((item) => String(item.id) === taskId);
    if (!task) {
      return;
    }

    this.moveTask(task, status);
  }

  clearDragState(): void {
    this.activeDropColumn = null;
  }

  shakeCompletedTask(task: PetTaskItem): void {
    const taskId = Number(task.id);
    this.shakingTaskIds.add(taskId);
    
    // Remove shake class after animation completes
    setTimeout(() => {
      this.shakingTaskIds.delete(taskId);
    }, 400);
  }

  isTaskShaking(task: PetTaskItem): boolean {
    return this.shakingTaskIds.has(Number(task.id));
  }

  async removeTask(task: PetTaskItem): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete task "${task.title}"?`,
      {
        title: 'Delete care task',
        confirmText: 'Delete task',
        cancelText: 'Keep task',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.petProfileService.deleteMyPetTask(userId, this.pet.id, Number(task.id)).subscribe({
      next: () => {
        this.petTasks = this.petTasks.filter((item) => item.id !== task.id);
        this.success = 'Task removed from board.';
      },
      error: (err) => {
        this.error = this.extractError(err, 'Unable to delete task.');
      }
    });
  }

  getUrgencyClass(urgency: PetTaskUrgency): string {
    switch (urgency) {
      case 'CRITICAL':
        return 'urgency-critical';
      case 'HIGH':
        return 'urgency-high';
      case 'MEDIUM':
        return 'urgency-medium';
      default:
        return 'urgency-low';
    }
  }

  formatUrgency(urgency: PetTaskUrgency): string {
    return urgency.charAt(0) + urgency.slice(1).toLowerCase();
  }

  formatRecurrence(recurrence: PetTaskRecurrence): string {
    if (recurrence === 'NONE') {
      return 'One-time';
    }
    return recurrence.charAt(0) + recurrence.slice(1).toLowerCase();
  }

  async deletePet(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId || !this.pet) {
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete ${this.pet.name}'s profile? This removes health history and care tasks.`,
      {
        title: 'Delete pet profile',
        confirmText: 'Delete pet',
        cancelText: 'Keep pet',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.error = '';
    this.success = '';
    this.petProfileService.deleteMyPet(userId, this.pet.id).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigate(['/app/pets']);
      },
      error: (err) => {
        this.deleting = false;
        this.error = this.extractError(err, 'Unable to delete pet profile.');
      }
    });
  }

  getDisplayAge(): string {
    if (!this.pet) {
      return 'Unknown';
    }
    return this.pet.ageDisplay || 'Unknown';
  }

  formatDate(dateText: string | null): string {
    if (!dateText) {
      return 'Unknown';
    }
    const parsed = new Date(dateText);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }
    return parsed.toLocaleDateString();
  }

  formatDateTime(dateTimeText: string | null): string {
    if (!dateTimeText) {
      return 'Unknown';
    }
    const parsed = new Date(dateTimeText);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }
    return parsed.toLocaleString();
  }

  formatEnumLabel(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  goBack(): void {
    this.router.navigate(['/app/pets']);
  }

  private getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.error = 'Please sign in to access pet profiles.';
      return null;
    }
    return user.id;
  }

  private toPayload(): PetProfilePayload {
    const value = this.petForm.value;
    return {
      name: String(value.name ?? '').trim(),
      weight: this.toNumber(value.weight),
      species: value.species as PetSpecies,
      breed: this.toText(value.breed),
      dateOfBirth: this.toText(value.dateOfBirth),
      gender: value.gender as PetGender,
      photoUrl: this.toText(value.photoUrl)
    };
  }

  private toHealthPayload(): PetHealthRecordPayload {
    const value = this.healthForm.value;
    return {
      recordDate: String(value.recordDate ?? '').trim(),
      visitType: String(value.visitType ?? '').trim(),
      veterinarian: this.toText(value.veterinarian),
      clinicName: this.toText(value.clinicName),
      bloodType: this.toText(value.bloodType),
      spayedNeutered: this.toText(value.spayedNeutered),
      allergies: this.toText(value.allergies),
      chronicConditions: this.toText(value.chronicConditions),
      previousOperations: this.toText(value.previousOperations),
      vaccinationHistory: this.toText(value.vaccinationHistory),
      specialDiet: this.toText(value.specialDiet),
      parasitePrevention: this.toText(value.parasitePrevention),
      emergencyInstructions: this.toText(value.emergencyInstructions),
      diagnosis: this.toText(value.diagnosis),
      treatment: this.toText(value.treatment),
      medications: this.toText(value.medications),
      notes: this.toText(value.notes),
      nextVisitDate: this.toText(value.nextVisitDate)
    };
  }

  private toTaskPayload(): PetCareTaskPayload {
    const value = this.taskForm.value;
    return {
      title: String(value.title ?? '').trim(),
      category: String(value.category ?? 'Other').trim() || 'Other',
      urgency: (value.urgency as PetTaskUrgency) ?? 'MEDIUM',
      status: (value.status as PetTaskStatus) ?? 'NOW',
      dueDate: this.toText(value.dueDate),
      notes: this.toText(value.notes),
      recurrence: (value.recurrence as PetTaskRecurrence) ?? 'NONE'
    };
  }

  private toTaskPayloadFromTask(task: PetTaskItem): PetCareTaskPayload {
    return {
      title: task.title,
      category: task.category,
      urgency: task.urgency,
      status: task.status,
      dueDate: task.dueDate,
      notes: task.notes,
      recurrence: task.recurrence
    };
  }

  private sortHealthRecords(records: PetHealthRecord[]): PetHealthRecord[] {
    return [...records].sort((first, second) => {
      const firstDate = new Date(first.recordDate).getTime();
      const secondDate = new Date(second.recordDate).getTime();
      if (firstDate !== secondDate) {
        return secondDate - firstDate;
      }
      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }

  private todayDateInput(): string {
    return new Date().toISOString().split('T')[0];
  }

  private nowDateTimeInput(): string {
    const date = new Date();
    date.setSeconds(0, 0);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private getDateDifferenceInDays(earlierDateText: string, laterDateText: string): number {
    const earlierDate = new Date(earlierDateText);
    const laterDate = new Date(laterDateText);
    if (Number.isNaN(earlierDate.getTime()) || Number.isNaN(laterDate.getTime())) {
      return 999;
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((laterDate.getTime() - earlierDate.getTime()) / millisecondsPerDay));
  }

  private normalizeDate(dateText: string): Date {
    const date = new Date(dateText);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private normalizeHealthLabel(value: string): string {
    return value
      .trim()
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private matchesTaskView(task: PetTaskItem): boolean {
    return this.matchesTaskFilter(task, this.activeTaskFilter)
      && this.matchesTaskSearch(task, this.taskSearchTerm);
  }

  private matchesTaskFilter(task: PetTaskItem, filter: TaskBoardFilter): boolean {
    switch (filter) {
      case 'OVERDUE':
        return this.isTaskOverdue(task);
      case 'DUE_TODAY':
        return task.status !== 'DONE' && task.dueDate === this.todayDateInput();
      case 'CRITICAL':
        return task.urgency === 'CRITICAL' && task.status !== 'DONE';
      case 'COMPLETED':
        return task.status === 'DONE';
      default:
        return true;
    }
  }

  private matchesTaskSearch(task: PetTaskItem, searchTerm: string): boolean {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return true;
    }

    const haystack = [
      task.title,
      task.category,
      task.notes ?? '',
      this.formatUrgency(task.urgency),
      this.formatRecurrence(task.recurrence)
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedTerm);
  }

  private matchesHealthView(record: PetHealthRecord): boolean {
    return this.matchesHealthFilter(record, this.activeHealthFilter)
      && this.matchesHealthSearch(record, this.healthSearchTerm);
  }

  private matchesHealthFilter(record: PetHealthRecord, filter: HealthViewFilter): boolean {
    if (filter === 'UPCOMING') {
      if (!record.nextVisitDate) {
        return false;
      }
      const nextVisitDate = this.normalizeDate(record.nextVisitDate);
      return nextVisitDate.getTime() >= this.startOfToday().getTime();
    }

    if (filter === 'OVERDUE') {
      if (!record.nextVisitDate) {
        return false;
      }
      const nextVisitDate = this.normalizeDate(record.nextVisitDate);
      return nextVisitDate.getTime() < this.startOfToday().getTime();
    }

    if (filter === 'WITH_DIAGNOSIS') {
      return !!(record.diagnosis && record.diagnosis.trim().length);
    }

    if (filter === 'THIS_YEAR') {
      const recordDate = new Date(record.recordDate);
      return !Number.isNaN(recordDate.getTime()) && recordDate.getFullYear() === new Date().getFullYear();
    }

    return true;
  }

  private getPreviousHealthRecord(record: PetHealthRecord): PetHealthRecord | null {
    const index = this.healthRecords.findIndex((item) => item.id === record.id);
    if (index < 0 || index >= this.healthRecords.length - 1) {
      return null;
    }
    return this.healthRecords[index + 1] ?? null;
  }

  private normalizeComparableValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  private getDateDifferenceFromToday(dateText: string): number {
    const date = this.normalizeDate(dateText);
    if (Number.isNaN(date.getTime())) {
      return 999;
    }
    const today = this.startOfToday();
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((date.getTime() - today.getTime()) / millisecondsPerDay);
  }

  private matchesHealthSearch(record: PetHealthRecord, searchTerm: string): boolean {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return true;
    }

    const haystack = [
      record.visitType,
      record.veterinarian ?? '',
      record.clinicName ?? '',
      record.diagnosis ?? '',
      record.treatment ?? '',
      record.notes ?? ''
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedTerm);
  }

  private getTrendIntensityClass(count: number, maxCount: number): string {
    if (count === 0) {
      return 'empty';
    }
    const ratio = count / maxCount;
    if (ratio >= 0.85) {
      return 'peak';
    }
    if (ratio >= 0.55) {
      return 'mid';
    }
    return 'low';
  }

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim();
    return text.length ? text : null;
  }

  private toDateTimeText(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) {
      return new Date().toISOString();
    }

    const normalized = text.length === 16 ? `${text}:00` : text;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private dateTimeLocalFromIso(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.nowDateTimeInput();
    }
    const timezoneOffset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private toNutritionProfilePayload(): PetNutritionProfilePayload {
    const value = this.nutritionProfileForm.value;
    return {
      goal: value.goal as PetNutritionGoal,
      activityLevel: value.activityLevel as PetActivityLevel,
      targetWeightKg: this.toNumber(value.targetWeightKg),
      dailyCalorieTarget: Number(value.dailyCalorieTarget ?? 0),
      mealsPerDay: Number(value.mealsPerDay ?? 0),
      foodPreference: this.toText(value.foodPreference),
      allergies: this.toText(value.allergies),
      forbiddenIngredients: this.toText(value.forbiddenIngredients)
    };
  }

  private toFeedingLogPayload(): PetFeedingLogPayload {
    const value = this.feedingLogForm.value;
    return {
      fedAt: this.toDateTimeText(value.fedAt),
      mealLabel: this.toText(value.mealLabel),
      foodName: String(value.foodName ?? '').trim(),
      portionGrams: Number(value.portionGrams ?? 0),
      caloriesActual: Number(value.caloriesActual ?? 0),
      status: value.status as PetFeedingStatus,
      note: this.toText(value.note)
    };
  }

  private patchNutritionForm(profile: PetNutritionProfile): void {
    this.nutritionProfileForm.patchValue({
      goal: profile.goal,
      activityLevel: profile.activityLevel,
      targetWeightKg: profile.targetWeightKg,
      dailyCalorieTarget: profile.dailyCalorieTarget,
      mealsPerDay: profile.mealsPerDay,
      foodPreference: profile.foodPreference ?? '',
      allergies: profile.allergies ?? '',
      forbiddenIngredients: profile.forbiddenIngredients ?? ''
    });
  }

  private refreshNutritionSummary(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }
    this.petProfileService.getMyPetNutritionSummary(userId, this.pet.id).subscribe({
      next: (summary) => {
        this.nutritionSummary = summary;
        this.startNutritionKpiAnimations();
      },
      error: (err) => {
        if (this.isNotFoundApiError(err)) {
          this.nutritionSummary = this.buildFallbackNutritionSummary();
          this.startNutritionKpiAnimations();
          this.nutritionMessage = 'Nutrition summary endpoint not found. Restart backend to activate nutrition analytics.';
        }
      }
    });
  }

  private refreshNutritionInsights(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    this.loadingNutritionInsights = true;
    this.petProfileService.getMyPetNutritionInsights(userId, this.pet.id, this.nutritionDaysWindow).subscribe({
      next: (insights) => {
        this.nutritionInsights = insights;
        this.startNutritionKpiAnimations();
        this.loadingNutritionInsights = false;
      },
      error: (err) => {
        this.loadingNutritionInsights = false;
        if (this.isNotFoundApiError(err)) {
          this.nutritionInsights = this.buildFallbackNutritionInsights();
          this.startNutritionKpiAnimations();
        }
      }
    });
  }

  private startNutritionKpiAnimations(): void {
    const token = ++this.nutritionAnimationToken;
    const summary = this.nutritionSummary;
    const insights = this.nutritionInsights;

    if (summary) {
      this.animateNumber(this.animatedNutritionSummary.todayCalories, summary.todayCalories, 520, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionSummary.todayCalories = value;
      });
      this.animateNumber(this.animatedNutritionSummary.remainingCalories, summary.remainingCalories, 520, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionSummary.remainingCalories = value;
      });
      this.animateNumber(this.animatedNutritionSummary.mealsLoggedToday, summary.mealsLoggedToday, 420, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionSummary.mealsLoggedToday = value;
      });
      this.animateNumber(this.animatedNutritionSummary.adherencePercent, summary.adherencePercent, 500, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionSummary.adherencePercent = value;
      });
    }

    if (insights) {
      this.animateNumber(this.animatedNutritionInsights.averageDailyCalories, insights.averageDailyCalories, 520, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionInsights.averageDailyCalories = value;
      });
      this.animateNumber(this.animatedNutritionInsights.calorieTargetDelta, insights.calorieTargetDelta, 520, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionInsights.calorieTargetDelta = value;
      });
      this.animateNumber(this.animatedNutritionInsights.streakDays, insights.streakDays, 420, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionInsights.streakDays = value;
      });
      this.animateNumber(this.animatedNutritionInsights.completionRatePercent, insights.completionRatePercent, 500, (value) => {
        if (token !== this.nutritionAnimationToken) {
          return;
        }
        this.animatedNutritionInsights.completionRatePercent = value;
      });
    }
  }

  private animateNumber(from: number, to: number, durationMs: number, onUpdate: (value: number) => void): void {
    const start = performance.now();
    const delta = to - from;

    if (delta === 0 || durationMs <= 0) {
      onUpdate(Math.round(to));
      return;
    }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      onUpdate(Math.round(from + (delta * eased)));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  private refreshFeedingLogs(): void {
    const userId = this.getCurrentUserId();
    if (!this.pet || !userId) {
      return;
    }

    this.petProfileService.getMyPetFeedingLogs(userId, this.pet.id).subscribe({
      next: (logs) => {
        this.feedingLogs = logs;
      }
    });
  }

  private flagNutritionApiUnavailable(err: unknown): void {
    if (this.isNotFoundApiError(err)) {
      this.nutritionApiUnavailable = true;
    }
  }

  private isNotFoundApiError(err: unknown): boolean {
    const apiError = err as { status?: number };
    return apiError?.status === 404;
  }

  private buildFallbackNutritionProfile(petId: number): PetNutritionProfile {
    return {
      id: null,
      petId,
      goal: 'MAINTAIN',
      activityLevel: 'MODERATE',
      targetWeightKg: this.pet?.weight ?? null,
      dailyCalorieTarget: 650,
      mealsPerDay: 2,
      foodPreference: null,
      allergies: null,
      forbiddenIngredients: null,
      createdAt: null,
      updatedAt: null
    };
  }

  private buildFallbackNutritionSummary(): PetNutritionSummary {
    return {
      dailyCalorieTarget: 650,
      todayCalories: 0,
      remainingCalories: 650,
      plannedMealsPerDay: 2,
      mealsLoggedToday: 0,
      mealsCompletedToday: 0,
      adherencePercent: 0
    };
  }

  private buildFallbackNutritionInsights(profile?: PetNutritionProfile | null): PetNutritionInsights {
    return {
      periodDays: this.nutritionDaysWindow,
      dailyCalorieTarget: this.nutritionSummary?.dailyCalorieTarget ?? profile?.dailyCalorieTarget ?? 650,
      averageDailyCalories: 0,
      calorieTargetDelta: 0,
      adherencePercent: 0,
      completionRatePercent: 0,
      streakDays: 0,
      longestStreakDays: 0,
      statusBreakdown: { GIVEN: 0, PARTIAL: 0, SKIPPED: 0 },
      calorieTrend: [],
      recommendations: ['Nutrition insights will appear once feeding logs are added.']
    };
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private toHttpUrlOrEmpty(value: string | null): string {
    if (!value) {
      return '';
    }
    return /^https?:\/\//i.test(value) ? value : '';
  }

  private applySelectedFile(file: File): void {
    this.clearSelectedPhoto();

    if (!file.type.startsWith('image/')) {
      this.error = 'Please select an image file.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image size must be 5MB or less.';
      return;
    }

    this.selectedPhotoFile = file;
    this.photoPreviewUrl = URL.createObjectURL(file);
    this.petForm.patchValue({ photoUrl: '' });
    this.error = '';
    this.success = 'Image selected successfully.';
  }

  private clearSelectedFile(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = null;
    }
    this.selectedPhotoFile = null;
  }

  private clearSelectedPhoto(): void {
    this.clearSelectedFile();
    this.photoPreviewUrl = null;
  }

  private isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private extractError(err: unknown, fallback: string): string {
    const apiError = err as { error?: unknown };
    const payload = apiError?.error;

    if (payload && typeof payload === 'object') {
      const keyedPayload = payload as Record<string, unknown>;
      if (typeof keyedPayload['error'] === 'string' && keyedPayload['error'].trim()) {
        return keyedPayload['error'];
      }
      if (typeof keyedPayload['message'] === 'string' && keyedPayload['message'].trim()) {
        return keyedPayload['message'];
      }

      const firstValidationMessage = Object.values(keyedPayload).find(
        (value) => typeof value === 'string' && value.trim().length > 0
      ) as string | undefined;
      if (firstValidationMessage) {
        return firstValidationMessage;
      }
    }

    return fallback;
  }

  private loadTasksForPet(userId: number, petId: number): void {
    this.petProfileService.getMyPetTasks(userId, petId).subscribe({
      next: (tasks) => {
        this.petTasks = this.sortTasks(tasks.map((task) => this.normalizeApiTask(task)));
      },
      error: (err) => {
        this.petTasks = [];
        this.error = this.extractError(err, 'Unable to load care tasks.');
      }
    });
  }

  private normalizeApiTask(source: PetCareTask): PetTaskItem {
    return {
      id: source.id,
      title: source.title,
      category: source.category,
      urgency: source.urgency,
      status: source.status,
      dueDate: source.dueDate,
      notes: source.notes,
      recurrence: source.recurrence,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt
    };
  }

  private sortTasks(tasks: PetTaskItem[]): PetTaskItem[] {
    const statusRank: Record<PetTaskStatus, number> = { NOW: 0, NEXT: 1, DONE: 2 };
    const urgencyRank: Record<PetTaskUrgency, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const maxDate = Number.MAX_SAFE_INTEGER;

    const uniqueTasks = Array.from(
      new Map(tasks.map((task) => [task.id, task])).values()
    );

    return uniqueTasks.sort((a, b) => {
      const statusDiff = statusRank[a.status] - statusRank[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const urgencyDiff = urgencyRank[a.urgency] - urgencyRank[b.urgency];
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : maxDate;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : maxDate;
      if (aDue !== bDue) {
        return aDue - bDue;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  private pastOrTodayDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null;
      }

      const selectedDate = new Date(value);
      if (Number.isNaN(selectedDate.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      return selectedDate > today ? { futureDate: true } : null;
    };
  }

  private nextVisitDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const recordDateValue = control.get('recordDate')?.value;
      const nextVisitDateValue = control.get('nextVisitDate')?.value;

      if (!recordDateValue || !nextVisitDateValue) {
        return null;
      }

      const recordDate = new Date(recordDateValue);
      const nextVisitDate = new Date(nextVisitDateValue);
      if (Number.isNaN(recordDate.getTime()) || Number.isNaN(nextVisitDate.getTime())) {
        return null;
      }

      return nextVisitDate < recordDate ? { nextVisitBeforeRecord: true } : null;
    };
  }

  private taskDueDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const statusValue = control.get('status')?.value as PetTaskStatus | null;
      const dueDateValue = control.get('dueDate')?.value as string | null;

      if (!statusValue || !dueDateValue || statusValue === 'DONE') {
        return null;
      }

      const dueDate = this.normalizeDate(dueDateValue);
      if (Number.isNaN(dueDate.getTime())) {
        return null;
      }

      return dueDate < this.startOfToday() ? { pastDueDate: true } : null;
    };
  }
}
