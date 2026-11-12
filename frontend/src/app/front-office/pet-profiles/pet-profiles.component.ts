import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { PetGender, PetPhotoProfileAnalysis, PetProfile, PetProfilePayload, PetSpecies } from '../../shared/models/pet-profile.model';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { PetProfileService } from '../../shared/services/pet-profile.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-pet-profiles',
  templateUrl: './pet-profiles.component.html',
  styleUrl: './pet-profiles.component.css'
})
export class PetProfilesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('petsMapPreview') private petsMapPreviewRef?: ElementRef<HTMLDivElement>;
  @ViewChild('petsMapModal') private petsMapModalRef?: ElementRef<HTMLDivElement>;

  pets: PetProfile[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  searchTerm = '';
  sortMode: 'name' | 'species' | 'recent' = 'name';
  formOpen = false;
  creationMode: 'manual' | 'ai' = 'manual';
  creationStep = 1;
  editingPetId: number | null = null;
  wizardOpen = false;
  photoPreviewUrl: string | null = null;
  selectedPhotoFile: File | null = null;
  uploadingPhoto = false;
  analyzingPhoto = false;
  aiPhotoHints: string[] = [];
  aiPhotoConfidence: number | null = null;
  isDragActive = false;
  locatingPetId: number | null = null;
  selectedMapPetId: number | null = null;
  trackedPetId: number | null = null;
  mapModalOpen = false;
  selectedSpecies: PetSpecies | '' = '';
  readonly speciesOptions: PetSpecies[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'FISH', 'REPTILE', 'OTHER'];
  readonly genderOptions: PetGender[] = ['MALE', 'FEMALE', 'UNKNOWN'];
  private readonly mapTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  private readonly mapAttribution = '&copy; OpenStreetMap contributors &copy; CARTO';
  private previewMap: L.Map | null = null;
  private modalMap: L.Map | null = null;
  private previewMarkerLayer: L.LayerGroup | null = null;
  private modalMarkerLayer: L.LayerGroup | null = null;

  petForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly confirmDialogService: ConfirmDialogService,
    private readonly petProfileService: PetProfileService,
    private readonly router: Router,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.petForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      weight: [null, [Validators.min(0.01)]],
      species: ['DOG', [Validators.required]],
      breed: ['', [Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      dateOfBirth: ['', [this.pastOrTodayDateValidator()]],
      gender: ['UNKNOWN', [Validators.required]],
      photoUrl: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadPets();
  }

  ngAfterViewInit(): void {
    this.initializePreviewMap();
  }

  ngOnDestroy(): void {
    this.previewMap?.remove();
    this.previewMap = null;
    this.modalMap?.remove();
    this.modalMap = null;
  }

  get petsWithLocationCount(): number {
    return this.pets.filter((pet) => this.hasGpsLocation(pet)).length;
  }

  get displayedPets(): PetProfile[] {
    const query = this.searchTerm.trim().toLowerCase();

    let items = [...this.pets];

    if (this.selectedSpecies) {
      items = items.filter((pet) => pet.species === this.selectedSpecies);
    }

    if (query) {
      items = items.filter((pet) =>
        pet.name.toLowerCase().includes(query)
        || (pet.breed ?? '').toLowerCase().includes(query)
        || pet.species.toLowerCase().includes(query)
      );
    }

    if (this.sortMode === 'species') {
      return items.sort((a, b) => `${a.species}${a.name}`.localeCompare(`${b.species}${b.name}`));
    }

    if (this.sortMode === 'recent') {
      return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  get filterSummary(): string {
    const activeFilters = Number(Boolean(this.searchTerm.trim())) + Number(Boolean(this.selectedSpecies));
    return `${this.displayedPets.length} shown of ${this.pets.length} total • ${activeFilters} filter${activeFilters === 1 ? '' : 's'} active`;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedSpecies = '';
    this.sortMode = 'name';
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || !!this.selectedSpecies || this.sortMode !== 'name';
  }

  get isCreateMode(): boolean {
    return this.editingPetId === null;
  }

  get isAiCreationMode(): boolean {
    return this.isCreateMode && this.creationMode === 'ai';
  }

  get isManualCreationMode(): boolean {
    return this.isCreateMode && this.creationMode === 'manual';
  }

  openPetDetails(petId: number): void {
    this.router.navigate(['/app/pets', petId]);
  }

  centerPetOnMap(pet: PetProfile, event?: Event): void {
    event?.stopPropagation();
    if (!this.hasGpsLocation(pet)) {
      return;
    }

    this.selectedMapPetId = pet.id;
    const activeMap = this.mapModalOpen ? this.modalMap : this.previewMap;
    activeMap?.flyTo([pet.latitude as number, pet.longitude as number], this.mapModalOpen ? 14 : 11, { duration: 0.8 });
  }

  openMapModal(): void {
    this.mapModalOpen = true;
    this.changeDetectorRef.detectChanges();
    requestAnimationFrame(() => {
      this.initializeModalMap();
      this.refreshMapMarkers();
    });
  }

  closeMapModal(): void {
    this.modalMap?.remove();
    this.modalMap = null;
    this.modalMarkerLayer = null;
    this.mapModalOpen = false;
  }

  trackCurrentLocationForPet(pet: PetProfile, event?: Event): void {
    event?.stopPropagation();
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    if (!navigator.geolocation) {
      this.error = 'Geolocation is not supported by this browser.';
      return;
    }

    this.locatingPetId = pet.id;
    this.error = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const updatedAt = new Date().toISOString();
        const payload: PetProfilePayload = {
          name: pet.name,
          weight: pet.weight,
          species: pet.species,
          breed: pet.breed,
          dateOfBirth: pet.dateOfBirth,
          gender: pet.gender,
          photoUrl: pet.photoUrl,
          latitude,
          longitude
        };

        const optimisticPet: PetProfile = {
          ...pet,
          latitude,
          longitude,
          locationUpdatedAt: updatedAt
        };

        this.pets = this.pets.map((item) => item.id === pet.id ? optimisticPet : item);
        this.selectedMapPetId = pet.id;
        this.trackedPetId = pet.id;
        this.refreshMapMarkers();
        this.centerPetOnMap(optimisticPet);

        this.petProfileService.updateMyPet(userId, pet.id, payload).subscribe({
          next: (updatedPet) => {
            const normalizedPet: PetProfile = {
              ...updatedPet,
              latitude,
              longitude,
              locationUpdatedAt: updatedAt
            };
            this.pets = this.pets.map((item) => item.id === normalizedPet.id ? normalizedPet : item);
            this.success = `${updatedPet.name}'s GPS location was updated.`;
            this.locatingPetId = null;
            this.refreshMapMarkers();
            this.centerPetOnMap(normalizedPet);
          },
          error: (err) => {
            this.locatingPetId = null;
            this.error = this.extractError(err, 'Unable to update pet GPS location.');
          }
        });
      },
      () => {
        this.locatingPetId = null;
        this.error = 'Unable to read your GPS location. Please allow location permissions.';
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  }

  hasGpsLocation(pet: PetProfile): boolean {
    return Number.isFinite(pet.latitude) && Number.isFinite(pet.longitude);
  }

  formatLocation(pet: PetProfile): string {
    if (!this.hasGpsLocation(pet)) {
      return 'No GPS signal yet';
    }
    return `${(pet.latitude as number).toFixed(5)}, ${(pet.longitude as number).toFixed(5)}`;
  }

  formatLocationUpdated(pet: PetProfile): string {
    if (!pet.locationUpdatedAt) {
      return 'Not tracked yet';
    }
    const date = new Date(pet.locationUpdatedAt);
    if (Number.isNaN(date.getTime())) {
      return 'Not tracked yet';
    }
    return `Updated ${date.toLocaleString()}`;
  }

  centerFirstTrackedPet(): void {
    const firstTrackedPet = this.pets.find((pet) => this.hasGpsLocation(pet));
    if (firstTrackedPet) {
      this.centerPetOnMap(firstTrackedPet);
    }
  }

  loadPets(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.petProfileService.getMyPets(userId).subscribe({
      next: (pets) => {
        this.pets = pets;
        this.loading = false;
        this.refreshMapMarkers();
      },
      error: (err) => {
        const errorMsg = this.extractError(err, 'Failed to load pets.');
        if (errorMsg.includes('Invalid user id') || errorMsg.includes('User ID')) {
          this.error = 'Your session is invalid. Please log out and log back in.';
        } else {
          this.error = errorMsg;
        }
        this.loading = false;
      }
    });
  }

  openCreateForm(mode: 'manual' | 'ai' = 'manual'): void {
    this.formOpen = true;
    this.creationMode = mode;
    this.creationStep = 1;
    this.editingPetId = null;
    this.clearSelectedPhoto();
    this.photoPreviewUrl = null;
    this.petForm.reset({
      name: '',
      weight: null,
      species: 'DOG',
      breed: '',
      dateOfBirth: '',
      gender: 'UNKNOWN',
      photoUrl: ''
    });
    this.error = '';
    this.success = '';
    this.aiPhotoHints = [];
    this.aiPhotoConfidence = null;
  }

  openWizard(): void {
    this.wizardOpen = true;
  }

  closeWizard(): void {
    this.wizardOpen = false;
  }

  onWizardComplete(wizardData: any): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload: PetProfilePayload = {
      name: wizardData.name,
      species: wizardData.species,
      breed: wizardData.breed || null,
      gender: wizardData.gender,
      dateOfBirth: wizardData.dateOfBirth || null,
      weight: wizardData.weight || null,
      photoUrl: null
    };

    this.petProfileService.createMyPet(userId, payload).pipe(
      switchMap((pet) => {
        if (!wizardData.photoFile) {
          return of(pet);
        }
        return this.petProfileService.uploadMyPetPhoto(userId, pet.id, wizardData.photoFile);
      })
    ).subscribe({
      next: (pet) => {
        this.saving = false;
        this.wizardOpen = false;
        this.success = `${pet.name}'s profile created successfully with AI assistance!`;
        this.loadPets();
      },
      error: (err) => {
        this.saving = false;
        this.error = this.extractError(err, 'Failed to create pet profile.');
      }
    });
  }

  openEditForm(pet: PetProfile): void {
    this.formOpen = true;
    this.editingPetId = pet.id;
    this.creationMode = 'manual';
    this.creationStep = 3;
    this.clearSelectedPhoto();
    this.photoPreviewUrl = pet.photoUrl ?? null;
    this.petForm.patchValue({
      name: pet.name,
      weight: pet.weight,
      species: pet.species,
      breed: pet.breed ?? '',
      dateOfBirth: pet.dateOfBirth ?? '',

      gender: pet.gender,
      photoUrl: this.toHttpUrlOrEmpty(pet.photoUrl)
    });
    this.error = '';
    this.success = '';
    this.aiPhotoHints = [];
    this.aiPhotoConfidence = null;
  }

  editPetFromCard(pet: PetProfile, event: Event): void {
    event.stopPropagation();
    this.openEditForm(pet);
  }

  cancelForm(): void {
    this.formOpen = false;
    this.creationStep = 1;
    this.creationMode = 'manual';
    this.editingPetId = null;
    this.clearSelectedPhoto();
    this.photoPreviewUrl = null;
    this.uploadingPhoto = false;
    this.analyzingPhoto = false;
    this.aiPhotoHints = [];
    this.aiPhotoConfidence = null;
    this.error = '';
  }

  previousCreationStep(): void {
    if (!this.isCreateMode) {
      return;
    }
    this.creationStep = Math.max(1, this.creationStep - 1);
  }

  nextCreationStep(): void {
    if (!this.isCreateMode) {
      return;
    }

    if (!this.canMoveToNextStep()) {
      this.petForm.markAllAsTouched();
      return;
    }

    this.creationStep = Math.min(3, this.creationStep + 1);
  }

  canMoveToNextStep(): boolean {
    if (!this.isCreateMode) {
      return false;
    }

    if (this.creationStep === 1) {
      if (this.isAiCreationMode) {
        return !!this.selectedPhotoFile;
      }
      const name = String(this.petForm.get('name')?.value ?? '').trim();
      return name.length > 0;
    }

    if (this.creationStep === 2) {
      return this.petForm.valid;
    }

    return false;
  }

  analyzePhotoForProfile(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    if (!this.selectedPhotoFile) {
      this.error = 'Please upload a photo first, then run AI profile generation.';
      return;
    }

    this.analyzingPhoto = true;
    this.error = '';
    this.success = '';
    this.aiPhotoHints = [];
    this.aiPhotoConfidence = null;

    this.petProfileService.analyzePetPhotoForProfile(userId, this.selectedPhotoFile).subscribe({
      next: (analysis) => {
        this.applyAiAnalysisToForm(analysis);
        if (this.isAiCreationMode) {
          this.creationStep = Math.max(this.creationStep, 2);
        }
        this.analyzingPhoto = false;
      },
      error: (err) => {
        this.analyzingPhoto = false;
        const status = (err as { status?: number })?.status ?? 0;
        const backendMessage = this.extractError(err, '');
        if (status === 404 || status === 405) {
          this.error = 'AI analysis endpoint is not available yet. Restart backend and try again.';
          return;
        }
        if (status >= 500) {
          const normalized = backendMessage.toLowerCase();
          if (normalized.includes('429') || normalized.includes('quota') || normalized.includes('resource_exhausted')) {
            this.error = 'AI provider quota exceeded (Gemini 429). Switch API key/project or wait for quota reset.';
            return;
          }
          if (normalized.includes('api key') || normalized.includes('permission') || normalized.includes('unauthenticated')) {
            this.error = 'Gemini API key/auth is invalid for this model. Check GEMINI_API_KEY and model access.';
            return;
          }
          this.error = 'AI service is reachable but failed to analyze this image. Check GEMINI settings and try another photo.';
          return;
        }
        this.error = backendMessage || 'AI analysis failed. Please try another pet photo.';
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

  removeSelectedPhoto(): void {
    this.clearSelectedPhoto();
    this.petForm.patchValue({ photoUrl: '' });
  }

  submitForm(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }

    if (this.isCreateMode && this.creationStep < 3) {
      this.nextCreationStep();
      return;
    }

    if (this.petForm.invalid) {
      this.petForm.markAllAsTouched();
      this.error = 'Please complete the required fields before creating the profile.';
      return;
    }

    const payload = this.toPayload();
    this.saving = true;
    this.uploadingPhoto = false;
    this.error = '';
    this.success = '';

    const request$ = this.editingPetId
      ? this.petProfileService.updateMyPet(userId, this.editingPetId, payload)
      : this.petProfileService.createMyPet(userId, payload);

    request$.pipe(
      switchMap((pet) => {
        if (!this.selectedPhotoFile) {
          return of(pet);
        }
        this.uploadingPhoto = true;
        return this.petProfileService.uploadMyPetPhoto(userId, pet.id, this.selectedPhotoFile);
      })
    ).subscribe({
      next: () => {
        this.saving = false;
        this.uploadingPhoto = false;
        this.formOpen = false;
        this.editingPetId = null;
        this.clearSelectedPhoto();
        this.photoPreviewUrl = null;
        this.success = 'Pet profile saved successfully.';
        this.loadPets();
      },
      error: (err) => {
        this.saving = false;
        this.uploadingPhoto = false;
        this.error = this.extractError(err, 'Failed to save pet profile.');
      }
    });
  }

  async deletePet(pet: PetProfile): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete ${pet.name}'s profile? This action cannot be undone.`,
      {
        title: 'Delete pet profile',
        confirmText: 'Delete profile',
        cancelText: 'Keep profile',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.petProfileService.deleteMyPet(userId, pet.id).subscribe({
      next: () => this.loadPets(),
      error: (err) => {
        this.error = this.extractError(err, 'Failed to delete pet profile.');
      }
    });
  }

  async deletePetFromCard(pet: PetProfile, event: Event): Promise<void> {
    event.stopPropagation();
    await this.deletePet(pet);
  }

  logoutAndRedirect(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getDisplayAge(pet: PetProfile): string {
    return pet.ageDisplay || 'Unknown';
  }

  getSpeciesIcon(species: PetSpecies): string {
    const map: Record<PetSpecies, string> = {
      DOG: 'fa-dog',
      CAT: 'fa-cat',
      BIRD: 'fa-dove',
      RABBIT: 'fa-carrot',
      HAMSTER: 'fa-paw',
      FISH: 'fa-fish',
      REPTILE: 'fa-dragon',
      OTHER: 'fa-paw'
    };
    return map[species] ?? 'fa-paw';
  }

  private getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.error = 'Please log in to manage your pets.';
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

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim();
    return text.length ? text : null;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private extractError(err: unknown, fallback: string): string {
    const apiError = err as { error?: { error?: string; message?: string } };
    return apiError?.error?.error || apiError?.error?.message || fallback;
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
    this.aiPhotoHints = [];
    this.aiPhotoConfidence = null;
  }

  private applyAiAnalysisToForm(analysis: PetPhotoProfileAnalysis): void {
    const patch: Partial<Record<'name' | 'species' | 'breed' | 'gender' | 'weight', string | number | null>> = {};

    if (analysis.species && analysis.species !== 'OTHER') {
      patch.species = analysis.species;
    }

    if (analysis.breed) {
      patch.breed = analysis.breed;
    }

    if (analysis.gender && analysis.gender !== 'UNKNOWN') {
      patch.gender = analysis.gender;
    }

    const existingName = String(this.petForm.get('name')?.value ?? '').trim();
    if (!existingName && analysis.suggestedName) {
      patch.name = analysis.suggestedName;
    }

    if (analysis.estimatedWeightKg && analysis.estimatedWeightKg > 0) {
      patch.weight = analysis.estimatedWeightKg;
    }

    this.petForm.patchValue(patch);
    this.aiPhotoHints = [
      ...(analysis.summary ? [analysis.summary] : []),
      ...analysis.detectedTraits,
      ...analysis.notes
    ].filter((item, index, arr) => !!item && arr.indexOf(item) === index).slice(0, 5);
    this.aiPhotoConfidence = analysis.confidence ?? null;

    if (analysis.sourceModel === 'fallback-rules') {
      this.success = 'AI provider is currently limited. You can continue with guided manual profile creation.';
      return;
    }

    this.success = `AI auto-filled profile fields${this.aiPhotoConfidence !== null ? ` (${this.aiPhotoConfidence}% confidence)` : ''}. Please review before saving.`;
  }

  private clearSelectedFile(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = null;
    }
    this.selectedPhotoFile = null;
  }

  private initializePreviewMap(): void {
    if (this.previewMap || !this.petsMapPreviewRef?.nativeElement) {
      return;
    }

    this.previewMap = L.map(this.petsMapPreviewRef.nativeElement, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    }).setView([36.8065, 10.1815], 5);

    this.addBaseTiles(this.previewMap);

    this.previewMarkerLayer = L.layerGroup().addTo(this.previewMap);
    this.refreshMapMarkers();
  }

  private initializeModalMap(): void {
    if (this.modalMap || !this.petsMapModalRef?.nativeElement) {
      return;
    }

    this.modalMap = L.map(this.petsMapModalRef.nativeElement, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false
    }).setView([36.8065, 10.1815], 6);

    this.addBaseTiles(this.modalMap);

    this.modalMarkerLayer = L.layerGroup().addTo(this.modalMap);
    this.refreshMapMarkers();
  }

  private addBaseTiles(map: L.Map): void {
    L.tileLayer(this.mapTileUrl, {
      maxZoom: 19,
      attribution: this.mapAttribution
    }).addTo(map);
  }

  refreshMapMarkers(): void {
    this.updateMapMarkers(this.previewMap, this.previewMarkerLayer, true, 11);
    this.updateMapMarkers(this.modalMap, this.modalMarkerLayer, true, 14);
  }

  private updateMapMarkers(map: L.Map | null, markerLayer: L.LayerGroup | null, fitBounds: boolean, maxZoom: number): void {
    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();
    const markers: L.Marker[] = [];
    const locationGroups = this.groupPetsByLocation();

    for (const group of locationGroups) {
      const anchorPet = group[0];
      const markerPosition: [number, number] = [anchorPet.latitude as number, anchorPet.longitude as number];
      const isTracked = group.some((pet) => pet.id === this.trackedPetId);
      const isSelected = group.some((pet) => pet.id === this.selectedMapPetId);
      const marker = L.marker(markerPosition, {
        icon: this.buildMarkerIcon(group, isTracked, isSelected),
        title: group.length === 1 ? group[0].name : `${group.length} pets at this location`
      });

      marker.bindPopup(this.buildGroupPopup(group));
      marker.on('click', () => {
        this.selectedMapPetId = group[0].id;
      });
      marker.addTo(markerLayer);
      this.attachMarkerSegmentHover(marker, group);
      markers.push(marker);
    }

    if (fitBounds && markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.25), { maxZoom });
    }

    setTimeout(() => map.invalidateSize(), 0);
  }

  private groupPetsByLocation(): PetProfile[][] {
    const buckets = new Map<string, PetProfile[]>();

    for (const pet of this.pets) {
      if (!this.hasGpsLocation(pet)) {
        continue;
      }

      const lat = pet.latitude as number;
      const lng = pet.longitude as number;
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(pet);
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values())
      .map((group) => [...group].sort((a, b) => a.id - b.id));
  }

  private buildMarkerIcon(group: PetProfile[], isTracked: boolean, isSelected: boolean): L.DivIcon {
    const selectedClass = isSelected ? ' selected' : '';
    const trackedClass = isTracked ? ' tracked' : '';
    const visiblePets = group.slice(0, 4);
    const segmentWidth = 100 / visiblePets.length;
    const segmentsHtml = visiblePets
      .map((pet, index) => {
        const imageUrl = this.resolveMarkerImageUrl(pet.photoUrl);
        const safeName = this.escapeHtml(pet.name);
        const left = index * segmentWidth;
        return `
          <span
            class="pet-map-pin-segment"
            data-pet-index="${index}"
            style="left:${left}%;width:${segmentWidth}%"
            title="${safeName}"
          >
            <img src="${imageUrl}" alt="${safeName}" loading="lazy" referrerpolicy="no-referrer" />
          </span>
        `;
      })
      .join('');
    const overflowBadge = group.length > visiblePets.length
      ? `<span class="pet-map-count-badge">+${group.length - visiblePets.length}</span>`
      : '';

    return L.divIcon({
      className: `pet-map-pin-wrap${selectedClass}${trackedClass}`,
      html: `
        <div class="pet-map-pin">
          <div class="pet-map-pin-head">
            ${segmentsHtml}
            ${overflowBadge}
          </div>
          <span class="pet-map-pin-tip"></span>
        </div>
      `,
      iconSize: [48, 62],
      iconAnchor: [24, 60],
      popupAnchor: [0, -52]
    });
  }

  private buildGroupPopup(group: PetProfile[]): string {
    if (group.length === 1) {
      const pet = group[0];
      return `<strong>${this.escapeHtml(pet.name)}</strong><br/>${this.escapeHtml(pet.species)}<br/>${this.escapeHtml(this.formatLocationUpdated(pet))}`;
    }

    const lines = group
      .map((pet) => `• ${this.escapeHtml(pet.name)} (${this.escapeHtml(pet.species)})`)
      .join('<br/>');
    return `<strong>${group.length} pets here</strong><br/>${lines}`;
  }

  private attachMarkerSegmentHover(marker: L.Marker, group: PetProfile[]): void {
    const markerElement = marker.getElement();
    if (!markerElement) {
      return;
    }

    const segments = markerElement.querySelectorAll<HTMLElement>('.pet-map-pin-segment');
    segments.forEach((segment) => {
      const indexText = segment.dataset['petIndex'];
      const index = indexText ? Number(indexText) : -1;
      const pet = group[index];
      if (!pet) {
        return;
      }

      segment.addEventListener('mouseenter', () => {
        const content = `<strong>${this.escapeHtml(pet.name)}</strong><br/>${this.escapeHtml(pet.species)}<br/>${this.escapeHtml(this.formatLocationUpdated(pet))}`;
        if (marker.getTooltip()) {
          marker.setTooltipContent(content);
        } else {
          marker.bindTooltip(content, {
            direction: 'top',
            offset: [0, -44],
            opacity: 0.95
          });
        }
        marker.openTooltip();
      });

      segment.addEventListener('mouseleave', () => {
        marker.closeTooltip();
      });
    });
  }

  private resolveMarkerImageUrl(photoUrl: string | null): string {
    if (photoUrl && photoUrl.trim().length > 0) {
      return photoUrl;
    }
    return 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=320&auto=format&fit=crop';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private clearSelectedPhoto(): void {
    this.clearSelectedFile();
    this.photoPreviewUrl = null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.petForm.get(fieldName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  hasFieldError(fieldName: string, errorKey: string): boolean {
    return !!this.petForm.get(fieldName)?.errors?.[errorKey] && this.isFieldInvalid(fieldName);
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

}
