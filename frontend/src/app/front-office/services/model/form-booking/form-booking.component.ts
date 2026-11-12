import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ServiceService } from '../../../services/service/service.service';
import { BookingService, ServiceBookingDTO } from '../../../services/service/booking.service';
import { AvailabilityService } from '../../../services/service/availabiliy.service';
import { AuthService } from '../../../../auth/auth.service';
import { PetProfileService } from '../../../../shared/services/pet-profile.service';
import { PetProfile } from '../../../../shared/models/pet-profile.model';

@Component({
  selector: 'app-form-booking',
  templateUrl: './form-booking.component.html',
  styleUrls: ['./form-booking.component.css']
})
export class FormBookingComponent implements OnInit {

  bookingForm!: FormGroup;
  serviceId!: number;
  service: any = null;
  options: any[] = [];
  availabilities: any[] = [];
  loading = true;

  // ── Pet selection ──────────────────────────────
  userPets: PetProfile[] = [];
  loadingPets = false;
  selectedPet: PetProfile | null = null;
  manualEntry = false; // true when user has no pets or chooses "other pet"

  // ── Submission state ───────────────────────────
  submitting = false;
  bookingError = '';

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private serviceService: ServiceService,
    private availabilityService: AvailabilityService,
    private authService: AuthService,
    private petProfileService: PetProfileService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('serviceId');
    this.serviceId = idParam ? +idParam : 0;

    if (!this.serviceId || isNaN(this.serviceId)) {
      alert('Invalid service ID');
      this.router.navigate(['/app/services']);
      return;
    }

    this.initForm();
    this.loadServiceAndAvailabilities();
    this.loadUserPets();
  }

  // ── Build Reactive Form ───────────────────────
  private initForm(): void {
    const currentUser = this.authService.getCurrentUser();
    this.bookingForm = this.fb.group({
      userId: [currentUser?.id ?? 1, Validators.required],
      petId: [null],           // filled when a registered pet is selected
      petName:  ['', [Validators.required, Validators.minLength(2)]],
      petType:  ['', Validators.required],
      petBreed: [''],
      petAge:   [1, [Validators.required, Validators.min(0), Validators.max(30)]],
      serviceId: [this.serviceId, Validators.required],
      selectedOptionIds: this.fb.array([]),
      availabilityId: [null, Validators.required],
      status: ['PENDING']
    });
  }

  // ── Load service + availability slots ────────
  private loadServiceAndAvailabilities(): void {
    this.loading = true;
    forkJoin({
      service: this.serviceService.findById(this.serviceId),
      availabilities: this.availabilityService.findByServiceId(this.serviceId)
    }).subscribe({
      next: (result) => {
        this.service = result.service;
        this.options = result.service.options || [];
        this.availabilities = result.availabilities.filter((a: any) => a.isAvailable !== false);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading service/availability:', err);
        this.loading = false;
      }
    });
  }

  // ── Load current user's registered pets ──────
  private loadUserPets(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.manualEntry = true;
      return;
    }
    this.loadingPets = true;
    this.petProfileService.getMyPets(currentUser.id).subscribe({
      next: (pets: PetProfile[]) => {
        this.userPets = pets;
        this.loadingPets = false;
        // If no pets registered, switch to manual entry
        if (pets.length === 0) {
          this.manualEntry = true;
        }
      },
      error: () => {
        this.loadingPets = false;
        this.manualEntry = true; // fallback to manual
      }
    });
  }

  // ── Called when user picks a pet card ────────
  selectPet(pet: PetProfile): void {
    this.selectedPet = pet;
    this.manualEntry = false;
    // Calculate age from dateOfBirth if available
    let age = 1;
    if (pet.dateOfBirth) {
      const born = new Date(pet.dateOfBirth);
      const now = new Date();
      age = Math.max(0, Math.floor((now.getTime() - born.getTime()) / (365.25 * 24 * 3600 * 1000)));
    }
    this.bookingForm.patchValue({
      petId:    pet.id,
      petName:  pet.name,
      petType:  pet.species?.toLowerCase() || '',
      petBreed: pet.breed || '',
      petAge:   age
    });
  }

  // ── Switch to "other / manual" mode ──────────
  switchToManual(): void {
    this.selectedPet = null;
    this.manualEntry = true;
    this.bookingForm.patchValue({
      petId: null, petName: '', petType: '', petBreed: '', petAge: 1
    });
  }

  // ── Extra options checkbox ────────────────────
  onOptionChange(optionId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const formArray = this.bookingForm.get('selectedOptionIds') as FormArray;
    if (checked) {
      formArray.push(new FormControl(optionId));
    } else {
      const index = formArray.controls.findIndex(c => c.value === optionId);
      if (index >= 0) formArray.removeAt(index);
    }
  }

  // ── Submit booking ────────────────────────────
  submitBooking(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.bookingError = 'Please fill in all required fields, including an available slot.';
      return;
    }

    this.submitting = true;
    this.bookingError = '';
    const value = this.bookingForm.value;

    const dto: ServiceBookingDTO = {
      userId:            value.userId,
      petName:           value.petName,
      petType:           value.petType,
      petBreed:          value.petBreed || '',
      petAge:            value.petAge,
      serviceId:         value.serviceId,
      selectedOptionIds: value.selectedOptionIds || [],
      availabilityId:    value.availabilityId,
      bookingDate:       new Date().toISOString(),
      status:            'PENDING'
    };

    this.bookingService.create(dto).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/app/services'], { queryParams: { booked: '1' } });
      },
      error: (err) => {
        this.submitting = false;
        this.bookingError = err.error?.message || 'An error occurred. Please try again.';
      }
    });
  }

  // ── Helpers ───────────────────────────────────
  getSpeciesEmoji(species: string): string {
    const map: Record<string, string> = {
      DOG: '🐕', CAT: '🐈', BIRD: '🦜', RABBIT: '🐰',
      HAMSTER: '🐹', FISH: '🐟', REPTILE: '🦎', OTHER: '🐾'
    };
    return map[(species || '').toUpperCase()] || '🐾';
  }

  get selectedOptionIds(): FormArray {
    return this.bookingForm.get('selectedOptionIds') as FormArray;
  }
}