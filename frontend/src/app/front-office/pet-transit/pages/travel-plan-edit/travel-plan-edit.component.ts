import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, finalize, map, of, switchMap, takeUntil, throwError } from 'rxjs';
import { PetSelectorModalComponent } from '../../components/pet-selector-modal/pet-selector-modal.component';
import { TravelDestination } from '../../models/travel-destination.model';
import {
  TRANSPORT_TYPE_LABELS,
  TransportType,
  TravelPlan,
  TravelPlanStatus,
  TravelPlanUpdateRequest
} from '../../models/travel-plan.model';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { Pet, PetService } from '../../services/pet.service';
import { RouteEstimateResult, RouteEstimatorService } from '../../services/route-estimator.service';
import { TravelDestinationService } from '../../services/travel-destination.service';
import {
  TravelPlanApiError,
  TravelPlanService,
  TravelPlanValidationIssue
} from '../../services/travel-plan.service';

@Component({
  selector: 'app-travel-plan-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PetSelectorModalComponent],
  templateUrl: './travel-plan-edit.component.html',
  styleUrl: './travel-plan-edit.component.scss'
})
export class TravelPlanEditComponent implements OnInit, OnDestroy {
  private readonly fb = new FormBuilder();

  readonly statusLabels: Record<TravelPlanStatus, string> = {
    DRAFT: 'Draft',
    IN_PREPARATION: 'In Preparation',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };

  readonly transportOptions = Object.entries(TRANSPORT_TYPE_LABELS).map(([value, label]) => ({
    value: value as TransportType,
    label
  }));

  readonly form = this.fb.group(
    {
      petId: [0, [Validators.required, Validators.min(1)]],
      origin: ['', [Validators.required, Validators.minLength(2)]],
      transportType: ['CAR' as TransportType, [Validators.required]],
      travelDate: ['', [Validators.required, this.futureDateValidator(true)]],
      returnDate: ['', [this.futureDateValidator(true), this.returnAfterDepartureValidator()]],
      estimatedTravelHours: [{ value: null as number | null, disabled: true }, [Validators.min(0.5)]],
      estimatedTravelCost: [{ value: null as number | null, disabled: true }, [Validators.min(0.01)]],
      currency: [{ value: '', disabled: true }, [Validators.maxLength(5)]],
      animalWeight: [null as number | null, [Validators.min(0.1)]],
      cageLength: [null as number | null, [Validators.required, Validators.min(1)]],
      cageWidth: [null as number | null, [Validators.required, Validators.min(1)]],
      cageHeight: [null as number | null, [Validators.required, Validators.min(1)]]
    },
    {
      validators: [TravelPlanEditComponent.currencyRequiredWhenCostProvided]
    }
  );

  destinationRecap: TravelDestination | null = null;
  currentPlan: TravelPlan | null = null;
  selectedPet: Pet | null = null;
  showPetSelector = false;
  currentUserId = 0;
  routeEstimate: RouteEstimateResult | null = null;
  estimateError = '';
  estimatingRoute = false;

  loading = true;
  saving = false;
  errorMessage = '';
  validationIssueMessages: string[] = [];

  private planId: number | null = null;
  private recommendedTransportType: TransportType = 'CAR';
  private petHydrationRunId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelPlanService: TravelPlanService,
    private readonly petService: PetService,
    private readonly destinationService: TravelDestinationService,
    private readonly toastService: PetTransitToastService,
    private readonly routeEstimatorService: RouteEstimatorService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.resolveCurrentUserId();

    this.attachNumericValidators();
    this.form.controls.travelDate.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.controls.returnDate.updateValueAndValidity({ emitEvent: false });
      });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const planId = Number(params.get('id'));
      this.clearServerValidationFeedback();

      if (Number.isNaN(planId) || planId <= 0) {
        this.loading = false;
        this.errorMessage = 'Invalid travel plan identifier.';
        this.toastService.error(this.errorMessage);
        return;
      }

      this.planId = planId;
      this.loadPlan(planId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get destinationLabel(): string {
    if (!this.currentPlan) {
      return 'Destination not available';
    }

    return `${this.currentPlan.destinationTitle} - ${this.currentPlan.destinationCountry}`;
  }

  get minDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  planStatusLabel(status: TravelPlanStatus): string {
    return this.statusLabels[status] ?? status;
  }

  hasDestinationImage(): boolean {
    return Boolean(this.destinationRecap?.coverImageUrl?.trim() || this.currentPlan?.destinationCoverImageUrl);
  }

  controlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  validationMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.errors || !(control.touched || control.dirty)) {
      return '';
    }

    if (control.errors['backend']) {
      return String(control.errors['backend']);
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }

    if (control.errors['invalidNumber']) {
      return 'Please enter a valid number.';
    }

    if (control.errors['minlength']) {
      return `Please enter at least ${control.errors['minlength'].requiredLength} characters.`;
    }

    if (control.errors['min']) {
      return 'Value must be greater than 0.';
    }

    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }

    return 'Please review this field.';
  }

  showCurrencyRequiredForCostError(): boolean {
    const error = this.form.errors?.['currencyRequiredForCost'];
    return Boolean(error) && (this.form.controls.estimatedTravelCost.touched || this.form.controls.currency.touched);
  }

  onSubmit(): void {
    if (!this.planId) {
      return;
    }

    this.clearServerValidationFeedback();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.petId.invalid) {
        this.errorMessage = 'Please select a pet profile before saving this plan.';
      }
      return;
    }

    this.saving = true;
    const payload = this.buildUpdatePayload();

    this.travelPlanService
      .updateTravelPlan(this.planId, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.toastService.success('Travel plan updated successfully.');
          this.router.navigate(['/app/transit/plans', this.planId]);
        },
        error: (error: unknown) => {
          this.applyServerError(error, 'Unable to update this travel plan right now. Please try again.');
          this.toastService.error(
            error instanceof Error ? error.message : 'Unable to update this travel plan right now. Please try again.'
          );
        }
      });
  }

  onCancel(): void {
    if (this.planId) {
      this.router.navigate(['/app/transit/plans', this.planId]);
      return;
    }

    this.router.navigate(['/app/transit/plans/my']);
  }

  onReset(): void {
    this.clearServerValidationFeedback();
    this.routeEstimate = null;
    this.estimateError = '';
    this.showPetSelector = false;

    if (this.currentPlan) {
      this.patchPlan(this.currentPlan);
    }
  }

  retry(): void {
    if (this.planId) {
      this.loadPlan(this.planId);
    }
  }

  onPetSelected(pet: Pet): void {
    this.petHydrationRunId += 1;
    this.selectedPet = pet;
    this.showPetSelector = false;
    this.form.patchValue({
      petId: pet.id,
      animalWeight: pet.weight
    });
  }

  openPetSelector(): void {
    this.currentUserId = this.resolveCurrentUserId();
    this.showPetSelector = true;
  }

  resolvePetPhotoUrl(photoUrl?: string): string {
    const normalized = String(photoUrl ?? '').trim();
    if (!normalized) {
      return '';
    }

    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('data:') ||
      normalized.startsWith('blob:')
    ) {
      return normalized;
    }

    return `http://localhost:8087/elif${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }

  getTransportIcon(): string {
    const transportType = this.form.controls.transportType.value ?? this.recommendedTransportType;
    switch (transportType) {
      case 'PLANE':
        return 'flight';
      case 'TRAIN':
        return 'train';
      case 'BUS':
        return 'directions_bus';
      case 'CAR':
      default:
        return 'directions_car';
    }
  }

  estimateRoute(): void {
    this.estimateError = '';
    this.routeEstimate = null;

    const origin = String(this.form.controls.origin.value ?? '').trim();
    if (!origin) {
      this.estimateError = 'Please enter your origin city first.';
      return;
    }

    const destinationLat = this.destinationRecap?.latitude;
    const destinationLng = this.destinationRecap?.longitude;

    if (
      destinationLat === null ||
      destinationLat === undefined ||
      destinationLng === null ||
      destinationLng === undefined
    ) {
      this.estimateError = 'Destination has no coordinates.';
      return;
    }

    const transport = this.form.controls.transportType.value ?? this.recommendedTransportType;
    this.estimatingRoute = true;

    this.routeEstimatorService
      .geocodeCity(origin)
      .pipe(
        switchMap((originCoords) => {
          if (!originCoords) {
            return throwError(() => new Error('Unable to geocode origin city.'));
          }

          if (transport === 'PLANE') {
            const distanceKm = this.routeEstimatorService.calculateDistanceKm(
              originCoords.lat,
              originCoords.lng,
              destinationLat,
              destinationLng
            );
            const durationHours = this.routeEstimatorService.estimateHoursFallback(distanceKm, transport);
            const durationMinutes = Math.max(1, Math.round(durationHours * 60));

            return of({
              distanceKm,
              durationHours,
              durationMinutes,
              summary: `${distanceKm} km estimated in about ${durationHours}h via plane`
            });
          }

          return this.routeEstimatorService.calculateRoute(
            originCoords.lat,
            originCoords.lng,
            destinationLat,
            destinationLng,
            transport
          );
        }),
        finalize(() => {
          this.estimatingRoute = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (estimate) => {
          this.routeEstimate = estimate;
          const transport = String(this.form.get('transportType')?.value ?? 'CAR');
          const cost = this.routeEstimatorService.estimateCost(estimate.distanceKm, transport);
          const country = this.destinationRecap?.country ?? this.currentPlan?.destinationCountry ?? '';
          const currency = this.routeEstimatorService.getCurrencyForCountry(country);

          this.form.patchValue({
            estimatedTravelHours: Number(estimate.durationHours.toFixed(2)),
            estimatedTravelCost: cost,
            currency
          });
        },
        error: (error: unknown) => {
          this.estimateError =
            error instanceof Error ? error.message : 'Unable to estimate the route right now.';
        }
      });
  }

  private loadPlan(planId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.routeEstimate = null;
    this.estimateError = '';
    this.petHydrationRunId += 1;

    this.travelPlanService
      .getTravelPlanById(planId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (plan) => {
          this.currentPlan = plan;
          this.patchPlan(plan);
          this.loadDestinationRecap(plan.destinationId);
        },
        error: (error: unknown) => {
          this.currentPlan = null;
          this.selectedPet = null;
          this.destinationRecap = null;
          this.applyServerError(error, 'Unable to load this travel plan for editing.');
          this.toastService.error(this.errorMessage || 'Unable to load this travel plan for editing.');
        }
      });
  }

  private loadDestinationRecap(destinationId: number): void {
    this.destinationService
      .getDestinationById(destinationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (destination) => {
          this.destinationRecap = destination;
          this.routeEstimate = null;
          this.estimateError = '';
          this.recommendedTransportType = destination.recommendedTransportType ?? 'CAR';
          const mappedCurrency = this.routeEstimatorService.getCurrencyForCountry(destination.country);
          this.form.patchValue({ currency: mappedCurrency }, { emitEvent: false });
        },
        error: () => {
          this.destinationRecap = null;
          this.recommendedTransportType = 'CAR';
        }
      });
  }

  private patchPlan(plan: TravelPlan): void {
    this.form.reset(
      {
        petId: plan.petId || 0,
        origin: plan.origin,
        transportType: plan.transportType,
        travelDate: this.toDateInputValue(plan.travelDate),
        returnDate: this.toDateInputValue(plan.returnDate),
        estimatedTravelHours: this.toNullablePositive(plan.estimatedTravelHours, 0.5),
        estimatedTravelCost: this.toNullablePositive(plan.estimatedTravelCost, 0.01),
        currency: plan.currency ?? '',
        animalWeight: this.toNullablePositive(plan.animalWeight, 0.1),
        cageLength: this.toNullablePositive(plan.cageLength, 1),
        cageWidth: this.toNullablePositive(plan.cageWidth, 1),
        cageHeight: this.toNullablePositive(plan.cageHeight, 1)
      },
      { emitEvent: false }
    );

    if (plan.petId && plan.petId > 0) {
      this.selectedPet = {
        id: plan.petId,
        name: plan.petName || `Pet #${plan.petId}`,
        species: '',
        breed: '',
        weight: this.toNullablePositive(plan.animalWeight, 0.1) ?? 0,
        gender: '',
        photoUrl: undefined,
        dateOfBirth: undefined
      };
    } else {
      this.selectedPet = null;
    }

    this.hydrateSelectedPetProfile(plan.petId);

    this.routeEstimate = null;
    this.estimateError = '';
  }

  private hydrateSelectedPetProfile(petId?: number): void {
    const normalizedPetId = Number(petId ?? 0);
    if (!Number.isFinite(normalizedPetId) || normalizedPetId <= 0) {
      return;
    }

    const runId = ++this.petHydrationRunId;

    this.petService
      .getMyPetById(normalizedPetId)
      .pipe(
        catchError(() =>
          this.petService.getMyPets().pipe(
            map((pets) => pets.find((pet) => Number(pet.id) === normalizedPetId) ?? null),
            catchError(() => of(null))
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (pet) => {
          if (!pet || runId !== this.petHydrationRunId) {
            return;
          }

          this.selectedPet = pet;

          const currentWeight = Number(this.form.controls.animalWeight.value ?? 0);
          const shouldSyncWeight =
            !this.form.controls.animalWeight.dirty || !Number.isFinite(currentWeight) || currentWeight <= 0;

          this.form.patchValue(
            {
              petId: pet.id,
              animalWeight: shouldSyncWeight ? pet.weight : this.form.controls.animalWeight.value
            },
            { emitEvent: false }
          );
        },
        error: () => {
          // Keep existing fallback pet information when pet profile hydration fails.
        }
      });
  }

  private buildUpdatePayload(): TravelPlanUpdateRequest {
    const raw = this.form.getRawValue();

    const estimatedTravelCost = this.toNullablePositive(raw.estimatedTravelCost, 0.01);
    const currency = String(raw.currency ?? '').trim().toUpperCase();

    const payload: TravelPlanUpdateRequest = {
      petId: Number(raw.petId ?? 0),
      origin: String(raw.origin ?? '').trim(),
      transportType: raw.transportType ?? 'CAR',
      travelDate: String(raw.travelDate ?? '').trim(),
      estimatedTravelHours: this.toNullablePositive(raw.estimatedTravelHours, 0.5),
      estimatedTravelCost,
      currency: estimatedTravelCost !== null ? (currency || null) : null,
      animalWeight: this.toNullablePositive(raw.animalWeight, 0.1),
      cageLength: this.toNullablePositive(raw.cageLength, 1),
      cageWidth: this.toNullablePositive(raw.cageWidth, 1),
      cageHeight: this.toNullablePositive(raw.cageHeight, 1)
    };

    const returnDate = String(raw.returnDate ?? '').trim();
    if (returnDate) {
      payload.returnDate = returnDate;
    }

    return payload;
  }

  private applyServerError(error: unknown, fallbackMessage: string): void {
    if (error instanceof TravelPlanApiError) {
      this.errorMessage = error.message || fallbackMessage;
      this.validationIssueMessages = error.validationIssues.map((issue) => issue.message);
      this.applyBackendFieldErrors(error.validationIssues);
      return;
    }

    this.errorMessage = error instanceof Error ? error.message : fallbackMessage;
    this.validationIssueMessages = [];
  }

  private applyBackendFieldErrors(issues: TravelPlanValidationIssue[]): void {
    for (const issue of issues) {
      const controlName = this.normalizeServerFieldName(issue.field);
      if (!controlName) {
        continue;
      }

      const control = this.form.get(controlName) as FormControl<unknown> | null;
      if (!control) {
        continue;
      }

      control.markAsTouched();
      control.setErrors({ ...(control.errors ?? {}), backend: issue.message });
    }
  }

  private normalizeServerFieldName(rawField: string): string {
    const normalized = String(rawField ?? '').trim();
    if (!normalized) {
      return '';
    }

    const lastSegment = normalized.split('.').pop() ?? normalized;
    return lastSegment.replace(/\[\d+\]/g, '').trim();
  }

  private clearServerValidationFeedback(): void {
    this.errorMessage = '';
    this.validationIssueMessages = [];

    Object.values(this.form.controls).forEach((control) => {
      const errors = control.errors;
      if (!errors || !errors['backend']) {
        return;
      }

      const { backend, ...rest } = errors;
      if (Object.keys(rest).length === 0) {
        control.setErrors(null);
      } else {
        control.setErrors(rest);
      }
    });
  }

  private toNullablePositive(value: unknown, minValue: number): number | null {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < minValue || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private toDateInputValue(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }

  private attachNumericValidators(): void {
    const controls = [
      'animalWeight',
      'estimatedTravelHours',
      'estimatedTravelCost',
      'cageLength',
      'cageWidth',
      'cageHeight'
    ];

    for (const controlName of controls) {
      const control = this.form.get(controlName);
      if (!control) {
        continue;
      }

      control.addValidators(TravelPlanEditComponent.validNumberValidator);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private static validNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return { invalidNumber: true };
    }

    return null;
  }

  futureDateValidator(editMode = false): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }

      if (editMode && !control.dirty) {
        return null;
      }

      const selected = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return selected > today ? null : { pastDate: true };
    };
  }

  returnAfterDepartureValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }

      const form = control.parent;
      if (!form) {
        return null;
      }

      const departure = form.get('travelDate')?.value;
      if (!departure) {
        return null;
      }

      return new Date(control.value) >= new Date(departure) ? null : { returnBeforeDeparture: true };
    };
  }

  private static currencyRequiredWhenCostProvided(control: AbstractControl): ValidationErrors | null {
    const estimatedTravelCost = Number(control.get('estimatedTravelCost')?.value ?? NaN);
    const currency = String(control.get('currency')?.value ?? '').trim();

    if (!Number.isNaN(estimatedTravelCost) && estimatedTravelCost > 0 && !currency) {
      return { currencyRequiredForCost: true };
    }

    return null;
  }

  private resolveCurrentUserId(): number {
    const userId = Number(this.travelPlanService.getCurrentUserId());
    if (Number.isNaN(userId) || userId <= 0) {
      return 0;
    }
    return userId;
  }
}
