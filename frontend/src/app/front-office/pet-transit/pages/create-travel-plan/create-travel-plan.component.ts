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
import { Subject, combineLatest, finalize, of, switchMap, takeUntil, throwError } from 'rxjs';
import { TravelDestination } from '../../models/travel-destination.model';
import {
  TRANSPORT_TYPE_LABELS,
  TravelPlan,
  TravelPlanCreateRequest,
  TravelPlanUpdateRequest,
  TransportType
} from '../../models/travel-plan.model';
import { TravelDestinationService } from '../../services/travel-destination.service';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import {
  TravelPlanApiError,
  TravelPlanService,
  TravelPlanValidationIssue
} from '../../services/travel-plan.service';
import { PetSelectorModalComponent } from '../../components/pet-selector-modal/pet-selector-modal.component';
import { Pet } from '../../services/pet.service';
import { RouteEstimateResult, RouteEstimatorService } from '../../services/route-estimator.service';

@Component({
  selector: 'app-create-travel-plan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, PetSelectorModalComponent],
  templateUrl: './create-travel-plan.component.html',
  styleUrl: './create-travel-plan.component.scss'
})
export class CreateTravelPlanComponent implements OnInit, OnDestroy {
  private readonly fb = new FormBuilder();

  readonly transportOptions = Object.entries(TRANSPORT_TYPE_LABELS).map(([value, label]) => ({
    value: value as TransportType,
    label
  }));

  readonly form = this.fb.group(
    {
      destinationId: [0, [Validators.required, Validators.min(1)]],
      petId: [0, [Validators.required, Validators.min(1)]],
      origin: ['', [Validators.required, Validators.minLength(2)]],
      transportType: ['CAR' as TransportType, [Validators.required]],
      travelDate: ['', [Validators.required, this.futureDateValidator()]],
      returnDate: ['', [this.futureDateValidator(), this.returnAfterDepartureValidator()]],
      estimatedTravelHours: [{ value: null as number | null, disabled: true }, [Validators.min(0)]],
      estimatedTravelCost: [{ value: null as number | null, disabled: true }, [Validators.min(0)]],
      currency: [{ value: '', disabled: true }, [Validators.maxLength(5)]],
      animalWeight: [null as number | null, [Validators.min(0.1)]],
      cageLength: [null as number | null, [Validators.required, Validators.min(1)]],
      cageWidth: [null as number | null, [Validators.required, Validators.min(1)]],
      cageHeight: [null as number | null, [Validators.required, Validators.min(1)]]
    },
    {
      validators: [CreateTravelPlanComponent.currencyRequiredWhenCostProvided]
    }
  );

  destinationRecap: TravelDestination | null = null;
  selectedPet: Pet | null = null;
  showPetSelector = false;
  currentUserId = 0;
  routeEstimate: RouteEstimateResult | null = null;
  estimateError = '';
  estimatingRoute = false;
  isEditMode = false;
  saving = false;
  loading = false;
  errorMessage = '';
  validationIssueMessages: string[] = [];

  private planId: number | null = null;
  private recommendedTransportType: TransportType = 'CAR';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelPlanService: TravelPlanService,
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

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, queryParams]) => {
        const planId = Number(params.get('id'));
        const destinationId = Number(queryParams.get('destinationId'));

        this.clearServerValidationFeedback();

        if (!Number.isNaN(planId) && planId > 0) {
          this.isEditMode = true;
          this.planId = planId;
          this.loadPlanForEdit(planId);
          return;
        }

        this.isEditMode = false;
        this.planId = null;

        if (!Number.isNaN(destinationId) && destinationId > 0) {
          this.form.patchValue({ destinationId, petId: 0 });
          this.selectedPet = null;
          this.routeEstimate = null;
          this.estimateError = '';
          this.loadDestinationRecap(destinationId);
        } else {
          this.destinationRecap = null;
          this.selectedPet = null;
          this.routeEstimate = null;
          this.estimateError = '';
          this.recommendedTransportType = 'CAR';
          this.form.patchValue({ destinationId: 0, petId: 0, transportType: 'CAR' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Refine Your Travel Plan' : 'Build Your Premium Travel Plan';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Save Changes' : 'Save Plan';
  }

  get destinationLabel(): string {
    if (!this.destinationRecap) {
      return 'Destination selected from catalog';
    }

    return `${this.destinationRecap.title} - ${this.destinationRecap.country}`;
  }

  get minDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  hasDestinationImage(): boolean {
    return Boolean(this.destinationRecap?.coverImageUrl?.trim());
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
      if (controlName === 'estimatedTravelHours') {
        return 'Estimated travel hours must be greater than or equal to 0.';
      }

      if (controlName === 'estimatedTravelCost') {
        return 'Estimated travel cost must be greater than or equal to 0.';
      }

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
    this.clearServerValidationFeedback();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.destinationId.invalid) {
        this.errorMessage = 'Please start from a destination card to create a plan.';
      } else if (this.form.controls.petId.invalid) {
        this.errorMessage = 'Please select a pet profile before saving the plan.';
      }
      return;
    }

    this.saving = true;

    if (this.isEditMode && this.planId) {
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
            this.toastService.success('Plan updated successfully');
            this.router.navigate(['/app/transit/plans/my']);
          },
          error: (error: unknown) => {
            this.applyServerError(error, 'Unable to update the plan. Please try again.');
            this.toastService.error(
              error instanceof Error ? error.message : 'Unable to update the plan. Please try again.'
            );
          }
        });
      return;
    }

    const payload = this.buildCreatePayload();
    const requestUrl = 'http://localhost:8087/elif/api/travel-plans';
    const headers = { 'X-User-Id': this.travelPlanService.getCurrentUserId() };
    console.log('Request URL:', requestUrl);
    console.log('Request headers:', headers);
    console.log('Request payload:', payload);

    this.travelPlanService
      .createTravelPlan(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.toastService.success('Plan created successfully');
          this.router.navigate(['/app/transit/plans/my']);
        },
        error: (error: unknown) => {
          this.applyServerError(error, 'Unable to save the plan. Please try again.');
          this.toastService.error(
            error instanceof Error ? error.message : 'Unable to save the plan. Please try again.'
          );
        }
      });
  }

  onCancel(): void {
    if (this.isEditMode && this.planId) {
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

    if (this.isEditMode && this.planId) {
      this.loadPlanForEdit(this.planId);
      return;
    }

    const destinationId = this.form.controls.destinationId.value ?? 0;

    this.form.reset({
      destinationId,
      petId: 0,
      origin: '',
      transportType: this.recommendedTransportType,
      travelDate: '',
      returnDate: '',
      estimatedTravelHours: null,
      estimatedTravelCost: null,
      currency: this.routeEstimatorService.getCurrencyForCountry(this.destinationRecap?.country ?? ''),
      animalWeight: null,
      cageLength: null,
      cageWidth: null,
      cageHeight: null
    });

    this.selectedPet = null;
  }

  onPetSelected(pet: Pet): void {
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

          const hours = estimate.durationHours;
          const transport = String(this.form.get('transportType')?.value ?? 'CAR');
          const cost = this.routeEstimatorService.estimateCost(estimate.distanceKm, transport);
          const country = this.destinationRecap?.country ?? '';
          const currency = this.routeEstimatorService.getCurrencyForCountry(country);

          this.form.patchValue({
            estimatedTravelHours: hours,
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

  private loadPlanForEdit(planId: number): void {
    this.loading = true;

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
          this.patchPlan(plan);
          this.loadDestinationRecap(plan.destinationId);
        },
        error: (error: unknown) => {
          this.applyServerError(error, 'Unable to load this travel plan for editing.');
        }
      });
  }

  private patchPlan(plan: TravelPlan): void {
    this.form.patchValue({
      destinationId: plan.destinationId,
      petId: plan.petId || 0,
      origin: plan.origin,
      transportType: plan.transportType,
      travelDate: this.toDateInputValue(plan.travelDate),
      returnDate: this.toDateInputValue(plan.returnDate),
      estimatedTravelHours: this.toNullableNonNegative(plan.estimatedTravelHours),
      estimatedTravelCost: this.toNullableNonNegative(plan.estimatedTravelCost),
      currency: plan.currency ?? '',
      animalWeight: this.toNullablePositive(plan.animalWeight, 0.1),
      cageLength: this.toNullablePositive(plan.cageLength, 1),
      cageWidth: this.toNullablePositive(plan.cageWidth, 1),
      cageHeight: this.toNullablePositive(plan.cageHeight, 1)
    });

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

          if (!this.isEditMode) {
            this.form.patchValue({
              transportType: this.recommendedTransportType,
              currency: mappedCurrency
            });
          } else {
            this.form.patchValue({ currency: mappedCurrency });
          }
        },
        error: () => {
          this.destinationRecap = null;
          this.recommendedTransportType = 'CAR';
        }
      });
  }

  private buildCreatePayload(): TravelPlanCreateRequest {
    const raw = this.form.getRawValue();

    const destinationId = this.toNumber(raw.destinationId);
    const origin = String(raw.origin ?? '').trim();
    const transportType = (raw.transportType ?? this.recommendedTransportType) as TransportType;
    const travelDate = String(raw.travelDate ?? '').trim();
    const returnDate = String(raw.returnDate ?? '').trim();

    const estimatedTravelHours = this.toNullableNonNegative(raw.estimatedTravelHours);
    const estimatedTravelCost = this.toNullableNonNegative(raw.estimatedTravelCost);
    const animalWeight = this.toNullablePositive(raw.animalWeight, 0.1);
    const cageLength = this.toNullablePositive(raw.cageLength, 1);
    const cageWidth = this.toNullablePositive(raw.cageWidth, 1);
    const cageHeight = this.toNullablePositive(raw.cageHeight, 1);
    const currency = String(raw.currency ?? '').trim().toUpperCase();

    const payload: TravelPlanCreateRequest = {
      petId: this.toNumber(raw.petId),
      destinationId,
      origin,
      transportType,
      travelDate,
      estimatedTravelHours,
      estimatedTravelCost,
      currency: estimatedTravelCost !== null ? (currency || null) : null,
      animalWeight,
      cageLength,
      cageWidth,
      cageHeight
    };

    if (returnDate) {
      payload.returnDate = returnDate;
    }

    return payload;
  }

  private buildUpdatePayload(): TravelPlanUpdateRequest {
    const raw = this.form.getRawValue();

    const payload: TravelPlanUpdateRequest = {
      petId: this.toNumber(raw.petId),
      origin: String(raw.origin ?? '').trim(),
      transportType: raw.transportType ?? this.recommendedTransportType,
      travelDate: String(raw.travelDate ?? '')
    };

    const returnDate = String(raw.returnDate ?? '').trim();
    if (returnDate) {
      payload.returnDate = returnDate;
    }

    this.appendOptionalTravelMetrics(payload, raw);

    return payload;
  }

  private appendOptionalTravelMetrics(
    payload: TravelPlanCreateRequest | TravelPlanUpdateRequest,
    raw: ReturnType<CreateTravelPlanComponent['form']['getRawValue']>
  ): void {
    const estimatedTravelHours = this.toNullableNonNegative(raw.estimatedTravelHours);
    const estimatedTravelCost = this.toNullableNonNegative(raw.estimatedTravelCost);
    const animalWeight = this.toNullablePositive(raw.animalWeight, 0.1);
    const cageLength = this.toNullablePositive(raw.cageLength, 1);
    const cageWidth = this.toNullablePositive(raw.cageWidth, 1);
    const cageHeight = this.toNullablePositive(raw.cageHeight, 1);

    if (estimatedTravelHours !== null) {
      payload.estimatedTravelHours = estimatedTravelHours;
    }

    if (estimatedTravelCost !== null) {
      payload.estimatedTravelCost = estimatedTravelCost;
      const currency = String(raw.currency ?? '').trim().toUpperCase();
      if (currency) {
        payload.currency = currency;
      }
    }

    if (animalWeight !== null) {
      payload.animalWeight = animalWeight;
    }

    if (cageLength !== null) {
      payload.cageLength = cageLength;
    }

    if (cageWidth !== null) {
      payload.cageWidth = cageWidth;
    }

    if (cageHeight !== null) {
      payload.cageHeight = cageHeight;
    }
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

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toNullablePositive(value: unknown, minExclusive: number): number | null {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed < minExclusive) {
      return null;
    }

    return parsed;
  }

  private toNullableNonNegative(value: unknown): number | null {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
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
    const cageControls = ['cageLength', 'cageWidth', 'cageHeight'];

    for (const controlName of cageControls) {
      const control = this.form.get(controlName);
      if (!control) {
        continue;
      }

      control.addValidators(CreateTravelPlanComponent.validNumberValidator);
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

  futureDateValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
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







