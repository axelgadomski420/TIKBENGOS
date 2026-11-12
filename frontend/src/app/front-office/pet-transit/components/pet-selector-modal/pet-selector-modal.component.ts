import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { Pet, PetService } from '../../services/pet.service';

@Component({
  selector: 'app-pet-selector-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './pet-selector-modal.component.html',
  styleUrl: './pet-selector-modal.component.scss'
})
export class PetSelectorModalComponent implements OnInit, OnChanges {
  @Input() userId = 0;
  @Output() petSelected = new EventEmitter<Pet>();
  @Output() closed = new EventEmitter<void>();

  pets: Pet[] = [];
  loading = false;
  errorMessage = '';

  constructor(private readonly petService: PetService) {}

  ngOnInit(): void {
    this.loadPets();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && !changes['userId'].firstChange) {
      this.loadPets();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pet-selector-backdrop')) {
      this.close();
    }
  }

  selectPet(pet: Pet): void {
    this.petSelected.emit(pet);
    this.closed.emit();
  }

  trackByPet(index: number, pet: Pet): number {
    return pet.id || index;
  }

  resolvePetPhotoUrl(photoUrl?: string): string | null {
    const normalized = String(photoUrl ?? '').trim();
    if (!normalized) {
      return null;
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

  speciesBadgeClass(species: string): string {
    const normalized = String(species ?? '').trim().toUpperCase();
    if (normalized === 'CAT') {
      return 'species-badge--cat';
    }
    if (normalized === 'DOG') {
      return 'species-badge--dog';
    }
    if (normalized === 'BIRD') {
      return 'species-badge--bird';
    }
    return 'species-badge--other';
  }

  formatSpecies(species: string): string {
    const normalized = String(species ?? '').trim();
    if (!normalized) {
      return 'Unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  getAgeLabel(dateOfBirth?: string): string {
    const value = String(dateOfBirth ?? '').trim();
    if (!value) {
      return '';
    }

    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) {
      return '';
    }

    const now = new Date();
    const ageYears = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();
    const dayDelta = now.getDate() - dob.getDate();

    let years = ageYears;
    let months = monthDelta;

    if (dayDelta < 0) {
      months -= 1;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years > 0) {
      return years === 1 ? '1 year' : `${years} years`;
    }

    if (months > 0) {
      return months === 1 ? '1 month' : `${months} months`;
    }

    return 'Less than 1 month';
  }

  private loadPets(): void {
    this.errorMessage = '';

    if (!Number.isFinite(this.userId) || this.userId <= 0) {
      this.pets = [];
      return;
    }

    this.loading = true;
    this.petService
      .getMyPets()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (pets) => {
          this.pets = (pets ?? []).filter((pet) => pet.id > 0);
        },
        error: (error: unknown) => {
          this.pets = [];
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'Unable to load your pets right now.';
        }
      });
  }
}
