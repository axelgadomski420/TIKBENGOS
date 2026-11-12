import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RequestService } from '../../services/request.service';
import { PetService } from '../../services/pet.service';
import { AuthService } from '../../../../auth/auth.service';
import { AdoptionPet } from '../../models/adoption-pet.model';

@Component({
  selector: 'app-request-form',
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.css']
})
export class RequestFormComponent implements OnInit {
  requestForm: FormGroup;
  pet: AdoptionPet | null = null;
  loading = true;
  submitting = false;
  error: string | null = null;
  success = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private requestService: RequestService,
    private petService: PetService,
    private authService: AuthService
  ) {
    this.requestForm = this.fb.group({
      notes: ['', [Validators.maxLength(500)]],
      housingType: ['', Validators.required],
      hasGarden: [false],
      hasChildren: [false],
      otherPets: [''],
      experienceLevel: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const petId = this.route.snapshot.params['id'];
    if (petId) {
      this.loadPet(petId);
    } else {
      this.error = 'Pet not found';
      this.loading = false;
    }
  }

  loadPet(id: number): void {
    this.petService.getById(id).subscribe({
      next: (data) => {
        this.pet = data;
        this.loading = false;
        if (!this.pet.available) {
          this.error = 'This pet is no longer available for adoption';
        }
      },
      error: (err) => {
        this.error = 'Error loading pet details';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    // Vérifier que le formulaire est valide
    if (this.requestForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.requestForm.controls).forEach(key => {
        this.requestForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Vérifier que pet existe
    if (!this.pet) {
      this.error = 'Pet information is missing';
      return;
    }

    // Vérifier que pet.id existe
    if (!this.pet.id) {
      this.error = 'Pet ID is missing';
      return;
    }

    this.submitting = true;
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.error = 'You must be logged in to adopt';
      this.submitting = false;
      return;
    }

    const requestData = {
      petId: this.pet.id,
      notes: this.requestForm.get('notes')?.value || '',
      housingType: this.requestForm.get('housingType')?.value,
      hasGarden: this.requestForm.get('hasGarden')?.value,
      hasChildren: this.requestForm.get('hasChildren')?.value,
      otherPets: this.requestForm.get('otherPets')?.value || '',
      experienceLevel: this.requestForm.get('experienceLevel')?.value
    };

    this.requestService.create(requestData, user.id).subscribe({
      next: () => {
        this.success = true;
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/app/adoption/my-requests']);
        }, 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error submitting adoption request';
        this.submitting = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/adoption/pets', this.pet?.id]);
  }

  getHousingTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'APARTMENT': 'Apartment',
      'HOUSE': 'House',
      'FARM': 'Farm',
      'OTHER': 'Other'
    };
    return types[type] || type;
  }

  getExperienceLevelLabel(level: string): string {
    const levels: { [key: string]: string } = {
      'BEGINNER': 'Beginner - First time pet owner',
      'INTERMEDIATE': 'Intermediate - Some experience',
      'EXPERIENCED': 'Experienced - Have owned pets before',
      'EXPERT': 'Expert - Very experienced with this species'
    };
    return levels[level] || level;
  }
}