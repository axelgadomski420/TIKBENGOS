import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { UploadService } from '../../../../front-office/adoption/services/upload.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-pet-form',
  templateUrl: './pet-form.component.html',
  styleUrls: ['./pet-form.component.css']
})
export class PetFormComponent implements OnInit {
  petForm: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  isEdit = false;
  petId: number | null = null;
  images: string[] = [];
  uploading = false;

  petTypes = ['CHIEN', 'CHAT', 'OISEAU', 'LAPIN', 'RONGEUR', 'REPTILE', 'POISSON', 'AUTRE'];
  genders = ['MALE', 'FEMELLE'];
  sizes = ['PETIT', 'MOYEN', 'GRAND', 'TRES_GRAND'];
  colors = [
    'Black', 'White', 'Brown', 'Golden', 'Gray', 'Cream', 'Orange',
    'Tabby', 'Calico', 'Brindle', 'Spotted', 'Other'
  ];
  shelters: any[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private uploadService: UploadService,
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
      description: [''],
      shelterId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadShelters();

    const id = this.route.snapshot.params['id'];
    if (id && id !== 'new') {
      this.isEdit = true;
      this.petId = +id;
      this.loadPet(this.petId);
    }
  }

  loadShelters(): void {
    this.adminService.getAllShelters().subscribe({
      next: (data) => {
        this.shelters = data;
      },
      error: (err) => {
        console.error('Error loading shelters', err);
        this.error = 'Error loading shelters';
      }
    });
  }

  loadPet(id: number): void {
    this.loading = true;
    this.adminService.getPetById(id).subscribe({
      next: (pet) => {
        this.petForm.patchValue({
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          size: pet.size,
          color: pet.color,
          healthStatus: pet.healthStatus,
          spayedNeutered: pet.spayedNeutered,
          specialNeeds: pet.specialNeeds,
          description: pet.description,
          shelterId: pet.shelter?.id ? String(pet.shelter.id) : ''
        });
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
        console.error('Error loading pet:', err);
        this.error = 'Error loading pet';
        this.loading = false;
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
    this.error = null;

    const shelterId = +this.petForm.get('shelterId')?.value;
    const selectedShelter = this.shelters.find((s) => s.id === shelterId);

    if (!selectedShelter) {
      this.error = 'Please select a valid shelter';
      this.submitting = false;
      return;
    }

    const petData = {
      name: this.petForm.get('name')?.value,
      type: this.petForm.get('type')?.value,
      breed: this.petForm.get('breed')?.value,
      age: this.petForm.get('age')?.value,
      gender: this.petForm.get('gender')?.value,
      size: this.petForm.get('size')?.value,
      color: this.petForm.get('color')?.value,
      healthStatus: this.petForm.get('healthStatus')?.value,
      spayedNeutered: this.petForm.get('spayedNeutered')?.value,
      specialNeeds: this.petForm.get('specialNeeds')?.value,
      description: this.petForm.get('description')?.value,
      photos: this.images.length > 0 ? JSON.stringify(this.images) : null,
      shelter: selectedShelter
    };

    if (this.isEdit && this.petId) {
      this.adminService.updatePet(this.petId, petData).subscribe({
        next: () => {
          this.uiToastService.success('Pet updated successfully.');
          this.router.navigate(['/admin/adoption/pets']);
        },
        error: (err) => {
          console.error('Update error:', err);
          this.error = err.error?.message || 'Error updating pet';
          this.submitting = false;
          this.uiToastService.error(this.error ?? 'Error updating pet');
        }
      });
    } else {
      this.adminService.createPet(petData).subscribe({
        next: () => {
          this.uiToastService.success('Pet created successfully.');
          this.router.navigate(['/admin/adoption/pets']);
        },
        error: (err) => {
          console.error('Create error:', err);
          this.error = err.error?.message || 'Error creating pet';
          this.submitting = false;
          this.uiToastService.error(this.error ?? 'Error creating pet');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/adoption/pets']);
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
