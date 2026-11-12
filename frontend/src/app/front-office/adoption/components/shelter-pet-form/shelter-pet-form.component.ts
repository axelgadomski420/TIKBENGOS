import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../auth/auth.service';
import { PetService } from '../../services/pet.service';
import { ShelterService } from '../../services/shelter.service';
import { UploadService } from '../../services/upload.service';
import { PetDescriptionService } from '../../services/pet-description.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-shelter-pet-form',
  templateUrl: './shelter-pet-form.component.html',
  styleUrls: ['./shelter-pet-form.component.css']
})
export class ShelterPetFormComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  petForm: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  isEdit = false;
  petId: number | null = null;
  shelterId: number | null = null;
  images: string[] = [];
  uploading = false;
  generatingDescription = false;

  petTypes = ['CHIEN', 'CHAT', 'OISEAU', 'LAPIN', 'RONGEUR', 'REPTILE', 'POISSON', 'AUTRE'];
  genders = ['MALE', 'FEMELLE'];
  sizes = ['PETIT', 'MOYEN', 'GRAND', 'TRES_GRAND'];
  colors = [
    'Black', 'White', 'Brown', 'Golden', 'Gray', 'Cream', 'Orange',
    'Tabby', 'Calico', 'Brindle', 'Spotted', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private petService: PetService,
    private shelterService: ShelterService,
    private uploadService: UploadService,
    private descriptionService: PetDescriptionService,
    private uiToastService: UiToastService
  ) {
    this.petForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      type: ['', Validators.required],
      breed: ['', Validators.maxLength(100)],
      age: [null, [Validators.min(0), Validators.max(360)]],
      gender: [''],
      size: [''],
      color: [''],
      healthStatus: ['Good'],
      spayedNeutered: [false],
      specialNeeds: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'SHELTER') {
      this.router.navigate(['/']);
      return;
    }

    if (!user.id) {
      this.router.navigate(['/']);
      return;
    }

    this.shelterService.getShelterByUserId(user.id).subscribe({
      next: (shelter) => {
        this.shelterId = shelter.id ?? null;

        const id = this.route.snapshot.params['id'];
        if (id && id !== 'new') {
          this.isEdit = true;
          this.petId = +id;
          this.loadPet(this.petId);
        }
      },
      error: (err) => {
        console.error('Shelter not found', err);
        this.error = 'Shelter profile not found';
        this.loading = false;
      }
    });
  }

  loadPet(id: number): void {
    this.loading = true;
    this.petService.getById(id).subscribe({
      next: (pet) => {
        this.petForm.patchValue(pet);
        if (pet.photos) {
          try {
            this.images = JSON.parse(pet.photos);
          } catch {
            this.images = [pet.photos];
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading pet';
        this.loading = false;
        console.error(err);
      }
    });
  }

  generateDescription(): void {
    const type = this.petForm.get('type')?.value;
    const breed = this.petForm.get('breed')?.value;
    const age = this.petForm.get('age')?.value;
    const specialNeeds = this.petForm.get('specialNeeds')?.value;
    const gender = this.petForm.get('gender')?.value;
    const size = this.petForm.get('size')?.value;
    const healthStatus = this.petForm.get('healthStatus')?.value;
    const spayedNeutered = this.petForm.get('spayedNeutered')?.value;

    let personality = '';
    if (gender) personality += `${gender === 'MALE' ? 'Male' : 'Female'}, `;
    if (size) personality += `${this.getPetSizeLabel(size).toLowerCase()}, `;
    if (healthStatus && healthStatus !== 'Good') personality += `${healthStatus} health, `;
    if (spayedNeutered) personality += 'spayed/neutered, ';

    if (!personality) {
      personality = 'Friendly and loving animal looking for a forever home';
    }

    if (!type) {
      this.uiToastService.warning('Please select the animal type first.');
      return;
    }

    this.generatingDescription = true;

    const request = {
      type,
      breed: breed || '',
      age: age || null,
      personality,
      specialNeeds: specialNeeds || ''
    };

    this.descriptionService.generateDescription(request).subscribe({
      next: (response) => {
        this.petForm.patchValue({ description: response.description });
        this.generatingDescription = false;
      },
      error: (err) => {
        console.error('Description generation error', err);
        this.uiToastService.error('Failed to generate description.');
        this.generatingDescription = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files.length) return;

    this.uploading = true;
    for (let i = 0; i < files.length; i++) {
      this.uploadService.uploadPetImage(files[i]).subscribe({
        next: (response) => {
          this.images.push(response.url);
          this.uploading = false;
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.uploading = false;
          this.error = 'Error uploading image';
          this.uiToastService.error('Failed to upload image.');
        }
      });
    }
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  onSubmit(): void {
    if (this.petForm.invalid) {
      this.petForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const petData = {
      ...this.petForm.value,
      photos: this.images.length > 0 ? JSON.stringify(this.images) : null
    };

    if (this.isEdit && this.petId) {
      this.petService.update(this.petId, petData).subscribe({
        next: () => {
          this.uiToastService.success('Pet updated successfully.');
          this.router.navigate(['/app/adoption/shelter/pets']);
        },
        error: (err) => {
          this.error = err.error?.message || 'Error updating pet';
          this.submitting = false;
          this.uiToastService.error(this.error ?? 'Error updating pet');
        }
      });
    } else {
      this.petService.create(petData, this.shelterId!).subscribe({
        next: () => {
          this.uiToastService.success('Pet created successfully.');
          this.router.navigate(['/app/adoption/shelter/pets']);
        },
        error: (err) => {
          this.error = err.error?.message || 'Error creating pet';
          this.submitting = false;
          this.uiToastService.error(this.error ?? 'Error creating pet');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/app/adoption/shelter/pets']);
  }

  getPetTypeLabel(type: string): string {
    const types: any = {
      CHIEN: 'Dog',
      CHAT: 'Cat',
      OISEAU: 'Bird',
      LAPIN: 'Rabbit',
      RONGEUR: 'Rodent',
      REPTILE: 'Reptile',
      POISSON: 'Fish',
      AUTRE: 'Other'
    };
    return types[type] || type;
  }

  getPetSizeLabel(size: string): string {
    const sizes: any = {
      PETIT: 'Small',
      MOYEN: 'Medium',
      GRAND: 'Large',
      TRES_GRAND: 'Extra Large'
    };
    return sizes[size] || size;
  }
}
