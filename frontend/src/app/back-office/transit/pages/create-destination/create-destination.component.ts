import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Observable,
  Subject,
  concatMap,
  finalize,
  from,
  map,
  of,
  switchMap,
  takeUntil,
  throwError,
  toArray
} from 'rxjs';
import {
  Destination,
  DestinationCarouselImage,
  DestinationCreateRequest,
  DestinationProgrammingMode,
  DestinationStatus,
  DestinationType,
  DestinationUpdateRequest,
  DocumentType,
  PetFriendlyLevel,
  TransportType
} from '../../models/destination.model';
import { DestinationService } from '../../services/destination.service';
import { AiGenerationRequest, DestinationAiService } from '../../services/destination-ai.service';
import { TransitToastService } from '../../services/transit-toast.service';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import { DestinationStatusBadgeComponent } from '../../components/destination-status-badge/destination-status-badge.component';
import { PetFriendlyStarsComponent } from '../../components/pet-friendly-stars/pet-friendly-stars.component';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';

type CreateDestinationFormModel = {
  title: FormControl<string>;
  country: FormControl<string>;
  region: FormControl<string>;
  destinationType: FormControl<DestinationType | null>;
  recommendedTransportType: FormControl<TransportType | null>;
  petFriendlyLevel: FormControl<PetFriendlyLevel>;
  description: FormControl<string>;
  safetyTips: FormControl<string>;
  requiredDocuments: FormControl<DocumentType[]>;
  coverImageUrl: FormControl<string>;
  latitude: FormControl<number | null>;
  longitude: FormControl<number | null>;
};

type FormFieldName = keyof CreateDestinationFormModel;
type ImageSourceMode = 'URL' | 'UPLOAD';
type EditSubmissionAction =
  | 'UPDATE_ONLY'
  | 'PUBLISH'
  | 'SCHEDULE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'MOVE_TO_DRAFT';
type SubmissionMode = DestinationProgrammingMode | EditSubmissionAction;
type DestinationSubmissionRequest = DestinationCreateRequest | DestinationUpdateRequest;
type CarouselPreviewItem = {
  key: string;
  imageUrl: string;
  existing: boolean;
  imageId?: number;
  pendingIndex?: number;
};

@Component({
  selector: 'app-create-destination',
  templateUrl: './create-destination.component.html',
  styleUrl: './create-destination.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    TransitToastContainerComponent,
    DestinationStatusBadgeComponent,
    PetFriendlyStarsComponent,
    MapPickerComponent
  ]
})
export class CreateDestinationComponent implements OnInit, OnDestroy {
  readonly starLevels: PetFriendlyLevel[] = [1, 2, 3, 4, 5];
  readonly programmingModes: DestinationProgrammingMode[] = ['PUBLISH', 'SCHEDULE', 'DRAFT'];
  readonly imageSourceModes: ImageSourceMode[] = ['URL', 'UPLOAD'];
  readonly placeholderCover = 'images/animals/cat.png';

  readonly destinationForm = new FormGroup<CreateDestinationFormModel>({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)]
    }),
    country: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    region: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    destinationType: new FormControl<DestinationType | null>(null, Validators.required),
    recommendedTransportType: new FormControl<TransportType | null>(null, Validators.required),
    petFriendlyLevel: new FormControl<PetFriendlyLevel>(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(5)]
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000)]
    }),
    safetyTips: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000)]
    }),
    requiredDocuments: new FormControl<DocumentType[]>([], { nonNullable: true }),
    coverImageUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)]
    }),
    latitude: new FormControl<number | null>(null),
    longitude: new FormControl<number | null>(null)
  });

  readonly scheduleAtControl = new FormControl('', { nonNullable: true });

  selectedProgrammingMode: DestinationProgrammingMode = 'DRAFT';
  selectedEditAction: EditSubmissionAction = 'UPDATE_ONLY';
  imageSourceMode: ImageSourceMode = 'URL';

  selectedCoverFile: File | null = null;
  selectedCoverFileName = '';
  selectedCoverPreviewUrl: string | null = null;
  coverAutoFilledFromCarousel = false;
  coverManuallySelected = false;
  existingCarouselImages: DestinationCarouselImage[] = [];
  selectedCarouselFiles: File[] = [];
  selectedCarouselPreviewUrls: string[] = [];
  removedCarouselImageIds = new Set<number>();
  scheduleTouched = false;

  isEditMode = false;
  isPageLoading = false;
  pageLoadError = '';
  isSaving = false;
  submitErrorMessage = '';
  isGeneratingDescription = false;
  isGeneratingSafetyTips = false;
  mapSearchQuery = '';

  private editingDestinationId: number | null = null;
  private loadedDestination: Destination | null = null;
  private countryRegionChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly previewNowIso = new Date().toISOString();

  constructor(
    private readonly destinationService: DestinationService,
    private readonly destinationAiService: DestinationAiService,
    private readonly transitToastService: TransitToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const destinationId = routeId ? Number(routeId) : Number.NaN;
    const isEditRoute = Number.isFinite(destinationId);

    if (!isEditRoute) {
      this.registerCoverUrlManualChange();
      return;
    }

    this.isEditMode = true;
    this.editingDestinationId = destinationId;
    this.registerCoverUrlManualChange();
    this.loadDestinationForEdit(destinationId);
  }

  ngOnDestroy(): void {
    if (this.countryRegionChangeTimeout) {
      clearTimeout(this.countryRegionChangeTimeout);
      this.countryRegionChangeTimeout = null;
    }

    this.releasePreviewObjectUrl();
    this.releaseCarouselPreviewObjectUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get destinationTypes(): DestinationType[] {
    return this.destinationService.destinationTypes;
  }

  get transportTypes(): TransportType[] {
    return this.destinationService.transportTypes;
  }

  get requiredDocumentTypes(): DocumentType[] {
    return this.destinationService.documentTypes;
  }

  get previewDestination(): Destination {
    const value = this.destinationForm.getRawValue();
    const now = this.previewNowIso;
    const status = this.previewStatus();
    const scheduleAt = this.scheduleAtControl.value.trim();

    return {
      id: this.loadedDestination?.id,
      title: value.title.trim() || 'Untitled destination',
      country: value.country.trim() || 'Country',
      region: value.region.trim() || 'Region',
      destinationType: value.destinationType ?? 'CITY',
      recommendedTransportType: value.recommendedTransportType ?? 'CAR',
      petFriendlyLevel: value.petFriendlyLevel,
      description: value.description.trim() || 'Description will appear here.',
      safetyTips: value.safetyTips.trim() || 'Safety tips will appear here.',
      requiredDocuments: value.requiredDocuments,
      coverImageUrl: value.coverImageUrl.trim(),
      latitude: value.latitude,
      longitude: value.longitude,
      status,
      createdAt: this.loadedDestination?.createdAt ?? now,
      updatedAt: this.loadedDestination?.updatedAt ?? now,
      publishedAt:
        status === 'PUBLISHED'
          ? this.loadedDestination?.publishedAt ?? now
          : this.loadedDestination?.publishedAt ?? null,
      scheduledPublishAt:
        status === 'SCHEDULED'
          ? (this.loadedDestination?.scheduledPublishAt ?? scheduleAt) || null
          : this.loadedDestination?.scheduledPublishAt ?? null
    };
  }

  pageSentence(): string {
    if (this.isEditMode) {
      return 'Refine destination data and keep every travel detail production ready';
    }
    return 'Design destination data, then publish, schedule, or save as draft';
  }

  sectionTitle(): string {
    return this.isEditMode ? 'Update Destination' : 'Create Destination';
  }

  imageModeLabel(mode: ImageSourceMode): string {
    return mode === 'URL' ? 'Image URL' : 'Upload Image';
  }

  imageModeSubtitle(mode: ImageSourceMode): string {
    return mode === 'URL'
      ? 'Use a hosted image link for preview and submit.'
      : 'Use a local file and send it as multipart upload.';
  }

  imageModeIcon(mode: ImageSourceMode): string {
    return mode === 'URL' ? 'fa-link' : 'fa-upload';
  }

  setImageSourceMode(mode: ImageSourceMode): void {
    this.imageSourceMode = mode;
  }

  isImageSourceModeSelected(mode: ImageSourceMode): boolean {
    return this.imageSourceMode === mode;
  }

  submitForm(): void {
    this.submitErrorMessage = '';
    this.scheduleTouched = this.requiresScheduleDate();

    if (this.destinationForm.invalid) {
      this.destinationForm.markAllAsTouched();
      this.submitErrorMessage = 'Please complete all required fields before continuing.';
      return;
    }

    if (this.requiresScheduleDate() && !this.scheduleAtControl.value.trim()) {
      this.submitErrorMessage = 'Select a schedule date and time before continuing.';
      return;
    }

    this.isSaving = true;
    const payload = this.buildSubmissionPayload();

    this.executeSubmission(payload)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ mode, destination }) => {
          this.loadedDestination = destination;
          this.transitToastService.success(this.successTitleForMode(mode), this.successMessageForMode(mode));
          this.router.navigate(['/admin/transit/destinations']);
        },
        error: (error: unknown) => {
          const message = this.extractErrorMessage(error);
          this.submitErrorMessage = message;
          this.transitToastService.error('Destination flow failed', message);
        }
      });
  }

  setProgrammingMode(mode: DestinationProgrammingMode): void {
    if (this.isEditMode) {
      return;
    }

    this.selectedProgrammingMode = mode;
    if (mode !== 'SCHEDULE') {
      this.scheduleTouched = false;
    }
  }

  isProgrammingModeSelected(mode: DestinationProgrammingMode): boolean {
    return this.selectedProgrammingMode === mode;
  }

  currentEditStatus(): DestinationStatus {
    return this.loadedDestination?.status ?? 'DRAFT';
  }

  editActionModes(): EditSubmissionAction[] {
    switch (this.currentEditStatus()) {
      case 'SCHEDULED':
        return ['UPDATE_ONLY', 'SCHEDULE', 'PUBLISH', 'MOVE_TO_DRAFT', 'ARCHIVE'];
      case 'PUBLISHED':
        return ['UPDATE_ONLY', 'ARCHIVE'];
      case 'ARCHIVED':
        return ['RESTORE', 'PUBLISH', 'SCHEDULE'];
      case 'DRAFT':
      default:
        return ['UPDATE_ONLY', 'PUBLISH', 'SCHEDULE'];
    }
  }

  setEditAction(action: EditSubmissionAction): void {
    if (!this.isEditMode) {
      return;
    }

    this.selectedEditAction = action;
    if (action !== 'SCHEDULE') {
      this.scheduleTouched = false;
    }
  }

  isEditActionSelected(action: EditSubmissionAction): boolean {
    return this.selectedEditAction === action;
  }

  editActionLabel(action: EditSubmissionAction): string {
    const status = this.currentEditStatus();

    switch (action) {
      case 'UPDATE_ONLY':
        if (status === 'SCHEDULED') {
          return 'Keep Scheduled';
        }
        if (status === 'PUBLISHED') {
          return 'Update and Keep Published';
        }
        return 'Save as Draft';
      case 'PUBLISH':
        return 'Publish Now';
      case 'SCHEDULE':
        return status === 'SCHEDULED' ? 'Reschedule' : 'Schedule';
      case 'ARCHIVE':
        return 'Archive';
      case 'RESTORE':
        return 'Restore Previous Status';
      case 'MOVE_TO_DRAFT':
        return 'Move to Draft';
      default:
        return 'Update';
    }
  }

  editActionSubtitle(action: EditSubmissionAction): string {
    switch (action) {
      case 'UPDATE_ONLY':
        return 'Update destination data without changing the current status.';
      case 'PUBLISH':
        return 'Update data, then publish immediately.';
      case 'SCHEDULE':
        return 'Update data, then set a publishing date.';
      case 'ARCHIVE':
        return 'Update data, then move this destination to archive.';
      case 'RESTORE':
        return 'Update data, then restore the previous active state.';
      case 'MOVE_TO_DRAFT':
        return 'Update data, then move this destination back to draft.';
      default:
        return 'Process destination update.';
    }
  }

  editActionIcon(action: EditSubmissionAction): string {
    switch (action) {
      case 'UPDATE_ONLY':
        return 'fa-floppy-disk';
      case 'PUBLISH':
        return 'fa-bullhorn';
      case 'SCHEDULE':
        return 'fa-clock';
      case 'ARCHIVE':
        return 'fa-box-archive';
      case 'RESTORE':
        return 'fa-box-open';
      case 'MOVE_TO_DRAFT':
        return 'fa-file-lines';
      default:
        return 'fa-pen';
    }
  }

  editActionTone(action: EditSubmissionAction): string {
    switch (action) {
      case 'PUBLISH':
      case 'RESTORE':
        return 'positive';
      case 'ARCHIVE':
        return 'danger';
      case 'MOVE_TO_DRAFT':
        return 'warning';
      case 'SCHEDULE':
        return 'info';
      case 'UPDATE_ONLY':
      default:
        return 'neutral';
    }
  }

  shouldShowScheduleControl(): boolean {
    if (this.isEditMode) {
      return this.selectedEditAction === 'SCHEDULE';
    }
    return this.selectedProgrammingMode === 'SCHEDULE';
  }

  scheduleLabel(): string {
    if (this.isEditMode && this.currentEditStatus() === 'SCHEDULED' && this.selectedEditAction === 'SCHEDULE') {
      return 'Reschedule date & time *';
    }
    return 'Schedule date & time *';
  }

  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (file) {
      this.imageSourceMode = 'UPLOAD';
      this.coverManuallySelected = true;
      this.coverAutoFilledFromCarousel = false;
    }

    this.assignCoverFile(file);
  }

  removeCoverFile(): void {
    if (this.coverAutoFilledFromCarousel && this.selectedCoverFile) {
      this.selectedCarouselFiles.unshift(this.selectedCoverFile);
      this.selectedCarouselPreviewUrls.unshift(URL.createObjectURL(this.selectedCoverFile));
    }

    this.assignCoverFile(null);
    this.coverAutoFilledFromCarousel = false;
    this.coverManuallySelected = false;
  }

  onCarouselImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ?? [];
    this.onCarouselFilesSelected(files);

    if (input) {
      input.value = '';
    }
  }

  onCarouselFilesSelected(files: FileList | File[]): void {
    const fileList = Array.from(files ?? []);
    if (fileList.length === 0) {
      return;
    }

    const coverUrlValue = this.destinationForm.controls.coverImageUrl.value.trim();
    const shouldAutoFillCover = !this.selectedCoverFile && !coverUrlValue;

    if (shouldAutoFillCover) {
      this.imageSourceMode = 'UPLOAD';
      this.assignCoverFile(fileList[0]);
      this.coverAutoFilledFromCarousel = true;
      this.coverManuallySelected = false;
    }

    const carouselCandidates = shouldAutoFillCover ? fileList.slice(1) : fileList;

    for (const file of carouselCandidates) {
      this.selectedCarouselFiles.push(file);
      this.selectedCarouselPreviewUrls.push(URL.createObjectURL(file));
    }
  }

  carouselPreviewItems(): CarouselPreviewItem[] {
    const currentCoverUrl = this.resolveCurrentCoverUrlForComparison();

    const existingItems: CarouselPreviewItem[] = this.existingCarouselImages
      .filter((image) => !image.id || !this.removedCarouselImageIds.has(image.id))
      .filter((image) => this.destinationService.resolveDestinationImageUrl(image.imageUrl) !== currentCoverUrl)
      .map((image, index) => ({
        key: `existing-${image.id ?? index}`,
        imageUrl: this.destinationService.resolveDestinationImageUrl(image.imageUrl),
        existing: true,
        imageId: image.id
      }))
      .filter((item) => item.imageUrl.length > 0);

    const pendingItems: CarouselPreviewItem[] = this.selectedCarouselPreviewUrls.map(
      (previewUrl, index) => ({
        key: `pending-${index}`,
        imageUrl: previewUrl,
        existing: false,
        pendingIndex: index
      })
    );

    return [...existingItems, ...pendingItems];
  }

  willReplaceExistingCarouselImages(): boolean {
    return this.isEditMode && this.selectedCarouselFiles.length > 0;
  }

  removeCarouselPreview(item: CarouselPreviewItem): void {
    if (item.existing) {
      if (!item.imageId) {
        this.existingCarouselImages = this.existingCarouselImages.filter(
          (image) =>
            this.destinationService.resolveDestinationImageUrl(image.imageUrl) !== item.imageUrl
        );
        return;
      }

      this.removedCarouselImageIds.add(item.imageId);
      return;
    }

    if (item.pendingIndex === undefined || item.pendingIndex < 0) {
      return;
    }

    this.removePendingCarouselFile(item.pendingIndex);
  }

  resetForm(): void {
    this.submitErrorMessage = '';
    this.scheduleTouched = false;

    if (this.isEditMode && this.loadedDestination) {
      this.patchFormWithDestination(this.loadedDestination);
      this.assignCoverFile(null);
      this.coverAutoFilledFromCarousel = false;
      this.coverManuallySelected = false;
      return;
    }

    this.destinationForm.reset(this.initialFormValue());
    this.destinationForm.markAsUntouched();
    this.destinationForm.markAsPristine();
    this.scheduleAtControl.setValue('');
    this.scheduleAtControl.markAsUntouched();
    this.scheduleAtControl.markAsPristine();
    this.selectedProgrammingMode = 'DRAFT';
    this.imageSourceMode = 'URL';
    this.assignCoverFile(null);
    this.coverAutoFilledFromCarousel = false;
    this.coverManuallySelected = false;
    this.existingCarouselImages = [];
    this.removedCarouselImageIds.clear();
    this.clearPendingCarouselFiles();
  }

  cancel(): void {
    this.router.navigate(['/admin/transit/destinations']);
  }

  setPetFriendlyLevel(level: PetFriendlyLevel): void {
    this.destinationForm.controls.petFriendlyLevel.setValue(level);
    this.destinationForm.controls.petFriendlyLevel.markAsDirty();
    this.destinationForm.controls.petFriendlyLevel.markAsTouched();
  }

  generateDescription(): void {
    if (this.isGeneratingDescription) {
      return;
    }

    this.isGeneratingDescription = true;

    this.destinationAiService
      .generateContent(this.buildAiGenerationRequest('DESCRIPTION'))
      .pipe(
        finalize(() => {
          this.isGeneratingDescription = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.errorMessage) {
            this.transitToastService.error('AI generation failed', response.errorMessage);
            return;
          }

          const generatedDescription = (response.description ?? '').trim();
          if (!generatedDescription) {
            this.transitToastService.error(
              'AI generation failed',
              'No description was generated. Please try again.'
            );
            return;
          }

          this.destinationForm.controls.description.setValue(generatedDescription);
          this.destinationForm.controls.description.markAsDirty();
          this.destinationForm.controls.description.markAsTouched();
        },
        error: (error: unknown) => {
          this.transitToastService.error('AI generation failed', this.extractErrorMessage(error));
        }
      });
  }

  generateSafetyTips(): void {
    if (this.isGeneratingSafetyTips) {
      return;
    }

    this.isGeneratingSafetyTips = true;

    this.destinationAiService
      .generateContent(this.buildAiGenerationRequest('SAFETY_TIPS'))
      .pipe(
        finalize(() => {
          this.isGeneratingSafetyTips = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.errorMessage) {
            this.transitToastService.error('AI generation failed', response.errorMessage);
            return;
          }

          const generatedSafetyTips = (response.safetyTips ?? '').trim();
          if (!generatedSafetyTips) {
            this.transitToastService.error(
              'AI generation failed',
              'No safety tips were generated. Please try again.'
            );
            return;
          }

          this.destinationForm.controls.safetyTips.setValue(generatedSafetyTips);
          this.destinationForm.controls.safetyTips.markAsDirty();
          this.destinationForm.controls.safetyTips.markAsTouched();
        },
        error: (error: unknown) => {
          this.transitToastService.error('AI generation failed', this.extractErrorMessage(error));
        }
      });
  }

  onMapLocationSelected(coords: { lat: number; lng: number }): void {
    this.destinationForm.patchValue({
      latitude: coords.lat,
      longitude: coords.lng
    });
  }

  onCountryOrRegionChange(): void {
    if (this.countryRegionChangeTimeout) {
      clearTimeout(this.countryRegionChangeTimeout);
    }

    this.countryRegionChangeTimeout = setTimeout(() => {
      const country = this.destinationForm.get('country')?.value?.trim() || '';
      const region = this.destinationForm.get('region')?.value?.trim() || '';

      if (country.length >= 2) {
        this.mapSearchQuery = region.length >= 2 ? `${region}, ${country}` : country;
      }
    }, 800);
  }

  onLocationResolved(event: { lat: number; lng: number; country: string; region: string }): void {
    const currentCountry = this.destinationForm.get('country')?.value?.trim() || '';
    const currentRegion = this.destinationForm.get('region')?.value?.trim() || '';

    if (event.country && event.country !== currentCountry) {
      this.destinationForm.patchValue({ country: event.country });
    }

    if (event.region && event.region !== currentRegion) {
      this.destinationForm.patchValue({ region: event.region });
    }

    this.destinationForm.patchValue({
      latitude: event.lat,
      longitude: event.lng
    });
  }

  toggleRequiredDocument(documentType: DocumentType): void {
    const currentDocuments = this.destinationForm.controls.requiredDocuments.value;
    const exists = currentDocuments.includes(documentType);

    const updatedDocuments = exists
      ? currentDocuments.filter((currentDocument) => currentDocument !== documentType)
      : [...currentDocuments, documentType];

    this.destinationForm.controls.requiredDocuments.setValue(updatedDocuments);
    this.destinationForm.controls.requiredDocuments.markAsDirty();
    this.destinationForm.controls.requiredDocuments.markAsTouched();
  }

  isRequiredDocumentSelected(documentType: DocumentType): boolean {
    return this.destinationForm.controls.requiredDocuments.value.includes(documentType);
  }

  hasControlError(fieldName: FormFieldName): boolean {
    const control = this.destinationForm.controls[fieldName];
    return control.invalid && (control.dirty || control.touched);
  }

  getControlError(fieldName: FormFieldName): string | null {
    const control = this.destinationForm.controls[fieldName];
    if (!this.hasControlError(fieldName)) {
      return null;
    }

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('maxlength')) {
      const maxLength = control.getError('maxlength')?.requiredLength;
      return `Maximum ${maxLength} characters allowed.`;
    }

    if (control.hasError('min')) {
      return 'Value is below the minimum allowed.';
    }

    if (control.hasError('max')) {
      return 'Value is above the maximum allowed.';
    }

    return 'Invalid value.';
  }

  hasScheduleError(): boolean {
    return this.scheduleTouched && this.requiresScheduleDate() && this.scheduleAtControl.value.trim().length === 0;
  }

  actionLabel(): string {
    if (!this.isEditMode) {
      switch (this.selectedProgrammingMode) {
        case 'PUBLISH':
          return this.isSaving ? 'Publishing...' : 'Create and Publish';
        case 'SCHEDULE':
          return this.isSaving ? 'Scheduling...' : 'Create and Schedule';
        case 'DRAFT':
        default:
          return this.isSaving ? 'Saving draft...' : 'Save as Draft';
      }
    }

    switch (this.selectedEditAction) {
      case 'PUBLISH':
        return this.isSaving ? 'Publishing update...' : 'Update and Publish Now';
      case 'SCHEDULE':
        return this.isSaving ? 'Scheduling update...' : 'Update and Schedule';
      case 'ARCHIVE':
        return this.isSaving ? 'Archiving update...' : 'Update and Archive';
      case 'RESTORE':
        return this.isSaving ? 'Restoring update...' : 'Update and Restore';
      case 'MOVE_TO_DRAFT':
        return this.isSaving ? 'Moving update to draft...' : 'Update and Move to Draft';
      case 'UPDATE_ONLY':
      default: {
        const status = this.currentEditStatus();
        if (status === 'SCHEDULED') {
          return this.isSaving ? 'Saving scheduled changes...' : 'Update and Keep Scheduled';
        }
        if (status === 'PUBLISHED') {
          return this.isSaving ? 'Saving published changes...' : 'Update and Keep Published';
        }
        return this.isSaving ? 'Saving draft changes...' : 'Update and Save as Draft';
      }
    }
  }

  modeLabel(mode: DestinationProgrammingMode): string {
    switch (mode) {
      case 'PUBLISH':
        return 'Publish';
      case 'SCHEDULE':
        return 'Schedule';
      case 'DRAFT':
      default:
        return 'Save as Draft';
    }
  }

  modeSubtitle(mode: DestinationProgrammingMode): string {
    switch (mode) {
      case 'PUBLISH':
        return 'Create now, then publish immediately';
      case 'SCHEDULE':
        return 'Create now, then publish later';
      case 'DRAFT':
      default:
        return 'Create now and keep as draft';
    }
  }

  modeIcon(mode: DestinationProgrammingMode): string {
    switch (mode) {
      case 'PUBLISH':
        return 'fa-bullhorn';
      case 'SCHEDULE':
        return 'fa-clock';
      case 'DRAFT':
      default:
        return 'fa-file-circle-plus';
    }
  }

  formatDestinationType(destinationType: DestinationType): string {
    return this.destinationService.formatDestinationType(destinationType);
  }

  formatTransportType(transportType: TransportType): string {
    return this.destinationService.formatTransportType(transportType);
  }

  formatDocumentLabel(documentType: DocumentType): string {
    return this.destinationService.formatDocumentType(documentType);
  }

  getDestinationTypeIcon(destinationType: DestinationType): string {
    switch (destinationType) {
      case 'BEACH':
        return 'fa-umbrella-beach';
      case 'MOUNTAIN':
        return 'fa-mountain';
      case 'CITY':
        return 'fa-city';
      case 'FOREST':
        return 'fa-tree';
      case 'ROAD_TRIP':
        return 'fa-road';
      case 'INTERNATIONAL':
      default:
        return 'fa-globe';
    }
  }

  getTransportIcon(transportType: TransportType): string {
    switch (transportType) {
      case 'CAR':
        return 'fa-car-side';
      case 'TRAIN':
        return 'fa-train';
      case 'PLANE':
        return 'fa-plane-departure';
      case 'BUS':
      default:
        return 'fa-bus';
    }
  }

  resolvePreviewImage(destination: Destination): string {
    if (this.imageSourceMode === 'UPLOAD') {
      return this.selectedCoverPreviewUrl ?? '';
    }

    return this.destinationService.resolveCoverImageUrl(destination.coverImageUrl);
  }

  hasPreviewImage(destination: Destination): boolean {
    return this.resolvePreviewImage(destination).length > 0;
  }

  previewImageHint(): string {
    return this.imageSourceMode === 'UPLOAD' ? 'Upload an image file to preview it here.' : 'Add a valid image URL to preview it here.';
  }

  onPreviewImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    image.src = this.placeholderCover;
  }

  getPreviewDateLabel(destination: Destination): string {
    if (destination.status === 'PUBLISHED' && destination.publishedAt) {
      return 'Published on';
    }
    if (destination.status === 'SCHEDULED' && destination.scheduledPublishAt) {
      return 'Scheduled for';
    }
    return 'Created on';
  }

  getPreviewDateValue(destination: Destination): string | undefined {
    if (destination.status === 'PUBLISHED' && destination.publishedAt) {
      return destination.publishedAt;
    }
    if (destination.status === 'SCHEDULED' && destination.scheduledPublishAt) {
      return destination.scheduledPublishAt;
    }
    return destination.createdAt;
  }

  reloadEditData(): void {
    if (!this.editingDestinationId) {
      return;
    }

    this.loadDestinationForEdit(this.editingDestinationId);
  }

  private executeSubmission(
    payload: DestinationSubmissionRequest
  ): Observable<{ mode: SubmissionMode; destination: Destination }> {
    const activeCoverFile = this.imageSourceMode === 'UPLOAD' ? this.selectedCoverFile : null;
    const carouselImageFiles = this.selectedCarouselFiles.length > 0 ? this.selectedCarouselFiles : null;

    if (this.isEditMode) {
      if (!this.editingDestinationId) {
        return throwError(() => new Error('Missing destination id for update.'));
      }

      return this.destinationService
        .updateDestination(
          this.editingDestinationId,
          payload as DestinationUpdateRequest,
          activeCoverFile,
          carouselImageFiles
        )
        .pipe(
          switchMap((destination) => this.applyCarouselImageChangesAfterUpdate(destination)),
          switchMap((destination) => this.applyEditAction(destination))
        );
    }

    return this.destinationService
      .createDestination(payload as DestinationCreateRequest, activeCoverFile, carouselImageFiles)
      .pipe(switchMap((createdDestination) => this.applyProgrammingAction(createdDestination)));
  }

  private applyEditAction(
    updatedDestination: Destination
  ): Observable<{ mode: EditSubmissionAction; destination: Destination }> {
    const destinationId = updatedDestination.id ?? this.editingDestinationId;
    if (!destinationId) {
      return throwError(() => new Error('Destination ID is missing after update.'));
    }

    switch (this.selectedEditAction) {
      case 'PUBLISH':
        return this.destinationService
          .publishDestination(destinationId)
          .pipe(map((destination) => ({ mode: 'PUBLISH' as const, destination })));
      case 'SCHEDULE': {
        const scheduledAt = this.scheduleAtControl.value.trim();
        if (!scheduledAt) {
          return throwError(() => new Error('Scheduled date-time is required.'));
        }
        return this.destinationService
          .scheduleDestination(destinationId, scheduledAt)
          .pipe(map((destination) => ({ mode: 'SCHEDULE' as const, destination })));
      }
      case 'ARCHIVE':
        return this.destinationService
          .archiveDestination(destinationId)
          .pipe(map((destination) => ({ mode: 'ARCHIVE' as const, destination })));
      case 'RESTORE':
        return this.destinationService
          .unarchiveDestination(destinationId)
          .pipe(map((destination) => ({ mode: 'RESTORE' as const, destination })));
      case 'MOVE_TO_DRAFT':
        return this.destinationService
          .moveDestinationToDraft(destinationId)
          .pipe(map((destination) => ({ mode: 'MOVE_TO_DRAFT' as const, destination })));
      case 'UPDATE_ONLY':
      default:
        return of({ mode: 'UPDATE_ONLY' as const, destination: updatedDestination });
    }
  }

  private applyCarouselImageChangesAfterUpdate(updatedDestination: Destination): Observable<Destination> {
    const destinationId = updatedDestination.id ?? this.editingDestinationId;
    if (!destinationId) {
      return of(updatedDestination);
    }

    if (this.selectedCarouselFiles.length > 0) {
      this.existingCarouselImages = updatedDestination.carouselImages ?? [];
      this.removedCarouselImageIds.clear();
      this.clearPendingCarouselFiles();
      return of(updatedDestination);
    }

    const removedImageIds = [...this.removedCarouselImageIds];
    if (removedImageIds.length === 0) {
      return of(updatedDestination);
    }

    return from(removedImageIds).pipe(
      concatMap((imageId) => this.destinationService.deleteCarouselImage(imageId)),
      toArray(),
      switchMap(() => this.destinationService.getDestinationById(destinationId)),
      map((destination) => {
        this.existingCarouselImages = destination.carouselImages ?? [];
        this.removedCarouselImageIds.clear();
        return destination;
      })
    );
  }

  private buildSubmissionPayload(): DestinationSubmissionRequest {
    const value = this.destinationForm.getRawValue();
    const shouldSendCoverUrl = this.imageSourceMode === 'URL' || !this.selectedCoverFile;
    const coverImageUrl = shouldSendCoverUrl ? value.coverImageUrl.trim() : undefined;

    const basePayload: DestinationCreateRequest = {
      title: value.title.trim(),
      country: value.country.trim(),
      region: value.region.trim(),
      destinationType: value.destinationType ?? 'CITY',
      recommendedTransportType: value.recommendedTransportType ?? 'CAR',
      petFriendlyLevel: value.petFriendlyLevel,
      description: value.description.trim(),
      safetyTips: value.safetyTips.trim(),
      requiredDocuments: value.requiredDocuments,
      coverImageUrl: coverImageUrl || undefined,
      latitude: value.latitude,
      longitude: value.longitude
    };

    if (!this.isEditMode) {
      return basePayload;
    }

    return {
      ...basePayload,
      replaceCarouselImages: this.selectedCarouselFiles.length > 0
    };
  }

  private applyProgrammingAction(
    createdDestination: Destination
  ): Observable<{ mode: DestinationProgrammingMode; destination: Destination }> {
    const destinationId = createdDestination.id;
    if (!destinationId) {
      return throwError(() => new Error('Destination ID is missing after creation.'));
    }

    if (this.selectedProgrammingMode === 'PUBLISH') {
      return this.destinationService
        .publishDestination(destinationId)
        .pipe(map((destination) => ({ mode: 'PUBLISH' as const, destination })));
    }

    if (this.selectedProgrammingMode === 'SCHEDULE') {
      const scheduledAt = this.scheduleAtControl.value.trim();
      if (!scheduledAt) {
        return throwError(() => new Error('Scheduled date-time is required.'));
      }

      return this.destinationService
        .scheduleDestination(destinationId, scheduledAt)
        .pipe(map((destination) => ({ mode: 'SCHEDULE' as const, destination })));
    }

    return of({ mode: 'DRAFT' as const, destination: createdDestination });
  }

  private successTitleForMode(mode: SubmissionMode): string {
    if (!this.isEditMode) {
      return 'Destination saved';
    }

    switch (mode) {
      case 'ARCHIVE':
        return 'Destination archived';
      case 'RESTORE':
        return 'Destination restored';
      case 'MOVE_TO_DRAFT':
        return 'Destination moved to draft';
      case 'PUBLISH':
        return 'Destination published';
      case 'SCHEDULE':
        return 'Destination scheduled';
      case 'UPDATE_ONLY':
      case 'DRAFT':
      default:
        return 'Destination updated';
    }
  }

  private successMessageForMode(mode: SubmissionMode): string {
    if (!this.isEditMode) {
      switch (mode) {
        case 'PUBLISH':
          return 'Destination created and published successfully.';
        case 'SCHEDULE': {
          const scheduleText = this.scheduleAtControl.value.trim();
          return scheduleText
            ? `Destination created and scheduled for ${scheduleText}.`
            : 'Destination created and scheduled successfully.';
        }
        case 'DRAFT':
        default:
          return 'Destination saved as draft successfully.';
      }
    }

    switch (mode) {
      case 'PUBLISH':
        return 'Destination updated and published successfully.';
      case 'SCHEDULE': {
        const scheduleText = this.scheduleAtControl.value.trim();
        return scheduleText
          ? `Destination updated and scheduled for ${scheduleText}.`
          : 'Destination updated and scheduled successfully.';
      }
      case 'ARCHIVE':
        return 'Destination updated and archived successfully.';
      case 'RESTORE':
        return 'Destination updated and restored successfully.';
      case 'MOVE_TO_DRAFT':
        return 'Destination updated and moved to draft successfully.';
      case 'UPDATE_ONLY':
      case 'DRAFT':
      default:
        return 'Destination changes saved successfully.';
    }
  }

  private previewStatus(): DestinationStatus {
    if (this.isEditMode) {
      return this.loadedDestination?.status ?? 'DRAFT';
    }

    switch (this.selectedProgrammingMode) {
      case 'PUBLISH':
        return 'PUBLISHED';
      case 'SCHEDULE':
        return 'SCHEDULED';
      case 'DRAFT':
      default:
        return 'DRAFT';
    }
  }

  private requiresScheduleDate(): boolean {
    if (this.isEditMode) {
      return this.selectedEditAction === 'SCHEDULE';
    }

    return this.selectedProgrammingMode === 'SCHEDULE';
  }

  private loadDestinationForEdit(destinationId: number): void {
    this.isPageLoading = true;
    this.pageLoadError = '';
    this.submitErrorMessage = '';

    this.destinationService
      .getDestinationById(destinationId)
      .pipe(
        finalize(() => {
          this.isPageLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (destination) => {
          this.loadedDestination = destination;
          this.patchFormWithDestination(destination);
        },
        error: () => {
          this.pageLoadError = 'Unable to load destination for editing. Please try again.';
        }
      });
  }

  private patchFormWithDestination(destination: Destination): void {
    this.destinationForm.reset({
      title: destination.title,
      country: destination.country,
      region: destination.region,
      destinationType: destination.destinationType,
      recommendedTransportType: destination.recommendedTransportType,
      petFriendlyLevel: destination.petFriendlyLevel,
      description: destination.description,
      safetyTips: destination.safetyTips,
      requiredDocuments: [...destination.requiredDocuments],
      coverImageUrl: destination.coverImageUrl ?? '',
      latitude: destination.latitude ?? null,
      longitude: destination.longitude ?? null
    });

    this.destinationForm.markAsPristine();
    this.destinationForm.markAsUntouched();

    this.scheduleAtControl.setValue(
      destination.scheduledPublishAt ? this.toDateTimeLocalInput(destination.scheduledPublishAt) : ''
    );
    this.scheduleAtControl.markAsPristine();
    this.scheduleAtControl.markAsUntouched();

    this.selectedEditAction = this.defaultEditActionForStatus(destination.status);
    this.imageSourceMode = 'URL';
    this.existingCarouselImages = [...(destination.carouselImages ?? [])];
    this.removedCarouselImageIds.clear();
    this.clearPendingCarouselFiles();
    this.assignCoverFile(null);
    this.coverAutoFilledFromCarousel = false;
    this.coverManuallySelected = false;
  }

  private defaultEditActionForStatus(status: DestinationStatus): EditSubmissionAction {
    if (status === 'ARCHIVED') {
      return 'RESTORE';
    }

    return 'UPDATE_ONLY';
  }

  private assignCoverFile(file: File | null): void {
    this.releasePreviewObjectUrl();

    this.selectedCoverFile = file;
    this.selectedCoverFileName = file?.name ?? '';
    this.selectedCoverPreviewUrl = file ? URL.createObjectURL(file) : null;
  }

  private releasePreviewObjectUrl(): void {
    if (this.selectedCoverPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedCoverPreviewUrl);
    }
  }

  private removePendingCarouselFile(index: number): void {
    const previewUrl = this.selectedCarouselPreviewUrls[index];
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    this.selectedCarouselPreviewUrls.splice(index, 1);
    this.selectedCarouselFiles.splice(index, 1);
  }

  private clearPendingCarouselFiles(): void {
    for (const previewUrl of this.selectedCarouselPreviewUrls) {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    }

    this.selectedCarouselPreviewUrls = [];
    this.selectedCarouselFiles = [];
  }

  private releaseCarouselPreviewObjectUrls(): void {
    this.clearPendingCarouselFiles();
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendPayload = error.error as { message?: string; errorMessage?: string } | null | undefined;
      const backendMessage = backendPayload?.message ?? backendPayload?.errorMessage;
      return backendMessage || 'Request failed. Please verify data and try again.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unexpected error. Please try again.';
  }

  private initialFormValue(): {
    title: string;
    country: string;
    region: string;
    destinationType: DestinationType | null;
    recommendedTransportType: TransportType | null;
    petFriendlyLevel: PetFriendlyLevel;
    description: string;
    safetyTips: string;
    requiredDocuments: DocumentType[];
    coverImageUrl: string;
    latitude: number | null;
    longitude: number | null;
  } {
    return {
      title: '',
      country: '',
      region: '',
      destinationType: null,
      recommendedTransportType: null,
      petFriendlyLevel: 3,
      description: '',
      safetyTips: '',
      requiredDocuments: [],
      coverImageUrl: '',
      latitude: null,
      longitude: null
    };
  }

  private toDateTimeLocalInput(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 16);
    }

    const pad = (num: number) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private registerCoverUrlManualChange(): void {
    this.destinationForm.controls.coverImageUrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.imageSourceMode !== 'URL') {
        return;
      }

      const hasCoverUrl = value.trim().length > 0;
      if (hasCoverUrl) {
        this.coverManuallySelected = true;
        this.coverAutoFilledFromCarousel = false;
        return;
      }

      if (!this.selectedCoverFile) {
        this.coverManuallySelected = false;
      }
    });
  }

  private resolveCurrentCoverUrlForComparison(): string {
    if (this.imageSourceMode !== 'URL') {
      return '';
    }

    const currentCoverUrl = this.destinationForm.controls.coverImageUrl.value.trim();
    if (!currentCoverUrl) {
      return '';
    }

    return this.destinationService.resolveDestinationImageUrl(currentCoverUrl);
  }

  private buildAiGenerationRequest(target: AiGenerationRequest['target']): AiGenerationRequest {
    const value = this.destinationForm.getRawValue();

    return {
      target,
      title: this.toOptionalText(value.title),
      country: this.toOptionalText(value.country),
      region: this.toOptionalText(value.region),
      destinationType: value.destinationType ?? undefined,
      transport: value.recommendedTransportType ?? undefined,
      petFriendlyLevel: value.petFriendlyLevel
    };
  }

  private toOptionalText(value: string | null | undefined): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized.length > 0 ? normalized : undefined;
  }
}
