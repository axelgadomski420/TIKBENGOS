import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import {
  AdminPetDashboardStats,
  PetGender,
  PetProfile,
  PetProfilePayload,
  PetSpecies
} from '../../shared/models/pet-profile.model';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { PetProfileService } from '../../shared/services/pet-profile.service';

@Component({
  selector: 'app-back-office-pets',
  templateUrl: './pets.component.html',
  styleUrl: './pets.component.css'
})
export class PetsComponent implements OnInit {
  pets: PetProfile[] = [];
  stats: AdminPetDashboardStats | null = null;
  loading = false;
  loadingStats = false;
  saving = false;
  processingBulk = false;
  error = '';
  success = '';
  selectedSpecies: PetSpecies | '' = '';
  searchTerm = '';
  sortMode: 'name' | 'created' | 'updated' | 'owner' = 'updated';
  showOnlyWithPhoto = false;
  showOnlyWithGps = false;
  page = 1;
  readonly pageSize = 12;
  editingPetId: number | null = null;
  selectedPhotoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  selectedPetIds = new Set<number>();
  bulkForm: FormGroup;
  readonly speciesOptions: PetSpecies[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'FISH', 'REPTILE', 'OTHER'];
  readonly genderOptions: PetGender[] = ['MALE', 'FEMALE', 'UNKNOWN'];
  editForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly confirmDialogService: ConfirmDialogService,
    private readonly petProfileService: PetProfileService
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      weight: [null, [Validators.min(0.01)]],
      species: ['DOG', [Validators.required]],
      breed: ['', [Validators.maxLength(100)]],
      dateOfBirth: [''],
      gender: ['UNKNOWN', [Validators.required]],
      photoUrl: ['', [Validators.pattern(/^$|^https?:\/\/.+/i), Validators.maxLength(500)]]
    });

    this.bulkForm = this.fb.group({
      species: [''],
      gender: [''],
      breed: ['', [Validators.maxLength(100)]]
    });
  }

  ngOnInit(): void {
    this.refreshDashboard();
  }

  get filteredPets(): PetProfile[] {
    const query = this.searchTerm.trim().toLowerCase();

    let filtered = [...this.pets];
    if (query) {
      filtered = filtered.filter((pet) =>
        pet.name.toLowerCase().includes(query)
        || String(pet.userId).includes(query)
        || (pet.breed ?? '').toLowerCase().includes(query)
        || pet.species.toLowerCase().includes(query)
      );
    }

    if (this.showOnlyWithPhoto) {
      filtered = filtered.filter((pet) => !!pet.photoUrl);
    }

    if (this.showOnlyWithGps) {
      filtered = filtered.filter((pet) => this.hasGpsLocation(pet));
    }

    if (this.sortMode === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortMode === 'created') {
      filtered.sort((a, b) => this.dateToNumber(b.createdAt) - this.dateToNumber(a.createdAt));
    } else if (this.sortMode === 'owner') {
      filtered.sort((a, b) => a.userId - b.userId);
    } else {
      filtered.sort((a, b) => this.dateToNumber(b.updatedAt) - this.dateToNumber(a.updatedAt));
    }

    return filtered;
  }

  get pagedPets(): PetProfile[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredPets.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPets.length / this.pageSize));
  }

  get selectedCount(): number {
    return this.selectedPetIds.size;
  }

  get allVisibleSelected(): boolean {
    if (!this.pagedPets.length) {
      return false;
    }
    return this.pagedPets.every((pet) => this.selectedPetIds.has(pet.id));
  }

  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.page > 1;
  }

  get summaryText(): string {
    return `${this.filteredPets.length} shown / ${this.pets.length} total`;
  }

  refreshDashboard(): void {
    this.loadAllPets();
    this.loadStats();
  }

  loadStats(): void {
    const adminId = this.getCurrentUserId();
    if (!adminId) {
      return;
    }
    this.loadingStats = true;
    this.petProfileService.getAdminPetStats(adminId).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loadingStats = false;
      },
      error: () => {
        this.loadingStats = false;
      }
    });
  }

  loadAllPets(): void {
    const adminId = this.getCurrentUserId();
    if (!adminId) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.petProfileService.getAllPetsForAdmin(adminId, this.selectedSpecies || undefined).subscribe({
      next: (pets) => {
        this.pets = pets;
        this.loading = false;
        this.reconcileSelection();
        this.ensurePageWithinBounds();
      },
      error: (err) => {
        this.error = this.extractError(err, 'Failed to load pet profiles for administration.');
        this.loading = false;
      }
    });
  }

  onSpeciesFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSpecies = (select.value as PetSpecies | '') || '';
    this.page = 1;
    this.loadAllPets();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.page = 1;
  }

  onSortModeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortMode = (select.value as 'name' | 'created' | 'updated' | 'owner') || 'updated';
    this.page = 1;
  }

  togglePhotoFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showOnlyWithPhoto = input.checked;
    this.page = 1;
  }

  toggleGpsFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showOnlyWithGps = input.checked;
    this.page = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.sortMode = 'updated';
    this.showOnlyWithPhoto = false;
    this.showOnlyWithGps = false;
    this.selectedSpecies = '';
    this.page = 1;
    this.loadAllPets();
  }

  goToNextPage(): void {
    if (this.hasNextPage) {
      this.page += 1;
    }
  }

  goToPreviousPage(): void {
    if (this.hasPreviousPage) {
      this.page -= 1;
    }
  }

  toggleSelectPet(petId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedPetIds.add(petId);
    } else {
      this.selectedPetIds.delete(petId);
    }
  }

  toggleSelectVisible(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.pagedPets.forEach((pet) => this.selectedPetIds.add(pet.id));
      return;
    }
    this.pagedPets.forEach((pet) => this.selectedPetIds.delete(pet.id));
  }

  selectAllFiltered(): void {
    this.filteredPets.forEach((pet) => this.selectedPetIds.add(pet.id));
  }

  clearSelection(): void {
    this.selectedPetIds.clear();
  }

  isSelected(petId: number): boolean {
    return this.selectedPetIds.has(petId);
  }

  applyBulkUpdate(): void {
    const adminId = this.getCurrentUserId();
    if (!adminId || !this.selectedPetIds.size) {
      return;
    }

    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    const value = this.bulkForm.value;
    const breed = this.toText(value.breed);
    const species = (value.species || null) as PetSpecies | null;
    const gender = (value.gender || null) as PetGender | null;
    if (!species && !gender && breed === null) {
      this.error = 'Choose at least one bulk field to update.';
      return;
    }

    this.processingBulk = true;
    this.error = '';
    this.success = '';

    this.petProfileService.bulkUpdatePetsAsAdmin(adminId, {
      petIds: Array.from(this.selectedPetIds),
      species: species || undefined,
      gender: gender || undefined,
      breed: breed || undefined
    }).subscribe({
      next: (result) => {
        this.processingBulk = false;
        this.success = `Bulk update completed: ${result.succeeded} succeeded, ${result.failed} failed.`;
        if (result.failed && result.errors?.length) {
          this.error = result.errors.slice(0, 3).join(' | ');
        }
        this.bulkForm.reset({ species: '', gender: '', breed: '' });
        this.refreshDashboard();
      },
      error: (err) => {
        this.processingBulk = false;
        this.error = this.extractError(err, 'Bulk update failed.');
      }
    });
  }

  async bulkDeleteSelected(): Promise<void> {
    const adminId = this.getCurrentUserId();
    if (!adminId || !this.selectedPetIds.size) {
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete ${this.selectedPetIds.size} selected pet profiles? This cannot be undone.`,
      {
        title: 'Delete selected pets',
        confirmText: 'Delete all',
        cancelText: 'Keep pets',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }

    this.processingBulk = true;
    this.error = '';
    this.success = '';

    this.petProfileService.bulkDeletePetsAsAdmin(adminId, {
      petIds: Array.from(this.selectedPetIds)
    }).subscribe({
      next: (result) => {
        this.processingBulk = false;
        this.success = `Bulk delete completed: ${result.succeeded} succeeded, ${result.failed} failed.`;
        if (result.failed && result.errors?.length) {
          this.error = result.errors.slice(0, 3).join(' | ');
        }
        this.clearSelection();
        this.refreshDashboard();
      },
      error: (err) => {
        this.processingBulk = false;
        this.error = this.extractError(err, 'Bulk delete failed.');
      }
    });
  }

  exportFilteredCsv(): void {
    const header = ['id', 'name', 'userId', 'species', 'breed', 'gender', 'weight', 'ageDisplay', 'hasPhoto', 'hasGps', 'updatedAt'];
    const rows = this.filteredPets.map((pet) => [
      pet.id,
      pet.name,
      pet.userId,
      pet.species,
      pet.breed ?? '',
      pet.gender,
      pet.weight ?? '',
      pet.ageDisplay,
      pet.photoUrl ? 'YES' : 'NO',
      this.hasGpsLocation(pet) ? 'YES' : 'NO',
      pet.updatedAt
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => this.csvCell(value)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-pets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  startEdit(pet: PetProfile): void {
    this.editingPetId = pet.id;
    this.clearSelectedPhoto();
    this.photoPreviewUrl = pet.photoUrl ?? null;
    this.editForm.patchValue({
      name: pet.name,
      weight: pet.weight,
      species: pet.species,
      breed: pet.breed ?? '',
      dateOfBirth: pet.dateOfBirth ?? '',
      gender: pet.gender,
      photoUrl: this.toHttpUrlOrEmpty(pet.photoUrl)
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.error = 'Please select an image file.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image size must be 5MB or less.';
      input.value = '';
      return;
    }

    this.clearSelectedPhoto();
    this.selectedPhotoFile = file;
    this.photoPreviewUrl = URL.createObjectURL(file);
    this.editForm.patchValue({ photoUrl: '' });
    this.error = '';
  }

  cancelEdit(): void {
    this.editingPetId = null;
    this.clearSelectedPhoto();
    this.photoPreviewUrl = null;
    this.editForm.reset({
      name: '',
      weight: null,
      species: 'DOG',
      breed: '',
      dateOfBirth: '',
      gender: 'UNKNOWN',
      photoUrl: ''
    });
  }

  submitEdit(): void {
    const adminId = this.getCurrentUserId();
    if (!adminId || !this.editingPetId) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.petProfileService.updatePetAsAdmin(adminId, this.editingPetId, this.toPayload()).pipe(
      switchMap((pet) => {
        if (!this.selectedPhotoFile) {
          return of(pet);
        }
        return this.petProfileService.uploadPetPhotoAsAdmin(adminId, pet.id, this.selectedPhotoFile);
      })
    ).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Pet profile updated successfully.';
        this.cancelEdit();
        this.refreshDashboard();
      },
      error: (err) => {
        this.saving = false;
        this.error = this.extractError(err, 'Failed to update pet profile.');
      }
    });
  }

  removeSelectedPhoto(): void {
    this.clearSelectedPhoto();
    this.photoPreviewUrl = null;
    this.editForm.patchValue({ photoUrl: '' });
  }

  async deletePet(pet: PetProfile): Promise<void> {
    const adminId = this.getCurrentUserId();
    if (!adminId) {
      return;
    }
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete ${pet.name}'s profile from back office? This cannot be undone.`,
      {
        title: 'Delete pet profile',
        confirmText: 'Delete profile',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    ));
    if (!confirmed) {
      return;
    }
    this.petProfileService.deletePetAsAdmin(adminId, pet.id).subscribe({
      next: () => {
        this.success = `${pet.name}'s profile was deleted.`;
        this.selectedPetIds.delete(pet.id);
        this.refreshDashboard();
      },
      error: (err) => {
        this.error = this.extractError(err, 'Failed to delete pet profile.');
      }
    });
  }

  hasGpsLocation(pet: PetProfile): boolean {
    return Number.isFinite(pet.latitude) && Number.isFinite(pet.longitude);
  }

  private getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.error = 'You must be logged in to access back-office pet management.';
      return null;
    }
    return user.id;
  }

  private toPayload(): PetProfilePayload {
    const value = this.editForm.value;
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

  private reconcileSelection(): void {
    const availableIds = new Set(this.pets.map((pet) => pet.id));
    Array.from(this.selectedPetIds).forEach((id) => {
      if (!availableIds.has(id)) {
        this.selectedPetIds.delete(id);
      }
    });
  }

  private ensurePageWithinBounds(): void {
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
    if (this.page < 1) {
      this.page = 1;
    }
  }

  private dateToNumber(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private csvCell(value: unknown): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
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

  private toHttpUrlOrEmpty(value: string | null): string {
    if (!value) {
      return '';
    }
    return /^https?:\/\//i.test(value) ? value : '';
  }

  private clearSelectedPhoto(): void {
    if (this.photoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.selectedPhotoFile = null;
  }

  private extractError(err: unknown, fallback: string): string {
    const apiError = err as { error?: { error?: string; message?: string } };
    return apiError?.error?.error || apiError?.error?.message || fallback;
  }
}
