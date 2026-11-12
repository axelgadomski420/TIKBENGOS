import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PetService } from '../../services/pet.service';
import { ShelterService } from '../../services/shelter.service';
import { AuthService } from '../../../../auth/auth.service';
import { AdoptionPet } from '../../models/adoption-pet.model';
import { Shelter } from '../../models/shelter.model';

@Component({
  selector: 'app-pet-detail',
  templateUrl: './pet-detail.component.html',
  styleUrls: ['./pet-detail.component.css']
})
export class PetDetailComponent implements OnInit {
  pet: AdoptionPet | null = null;
  shelter: Shelter | null = null;
  loading = true;
  error: string | null = null;
  
  // ✅ Variable pour savoir si l'utilisateur vient du wizard
  cameFromWizard = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetService,
    private shelterService: ShelterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    
    // ✅ Vérifier si l'utilisateur vient du wizard
    this.cameFromWizard = localStorage.getItem('cameFromWizard') === 'true';
    
    if (id) {
      this.loadPet(id);
    } else {
      this.error = 'Pet not found';
      this.loading = false;
    }
  }

  loadPet(id: number): void {
    this.loading = true;
    this.petService.getById(id).subscribe({
      next: (data) => {
        this.pet = data;
        this.loading = false;
        if (this.pet.shelterId) {
          this.loadShelter(this.pet.shelterId);
        }
      },
      error: (err) => {
        this.error = 'Error loading pet details';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadShelter(shelterId: number): void {
    this.shelterService.getById(shelterId).subscribe({
      next: (data) => {
        this.shelter = data;
      },
      error: (err) => {
        console.error('Error loading shelter:', err);
      }
    });
  }

  // ✅ Méthode - retour selon provenance (bouton principal)
  goBack(): void {
    if (this.cameFromWizard) {
      this.goBackToWizard();
    } else {
      this.goBackToAllPets();
    }
  }

  // ✅ Retour à la liste générale
  goBackToAllPets(): void {
    this.router.navigate(['/app/adoption/pets']);
  }

  // ✅ Retour au wizard (avec conservation des suggestions)
  goBackToWizard(): void {
    // Garder cameFromWizard pour ne pas perdre le contexte
    // Ne pas nettoyer localStorage ici pour conserver les suggestions
    this.router.navigate(['/app/adoption/find-my-pet']);
  }

  adopt(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
    } else {
      this.router.navigate(['/app/adoption/pets', this.pet?.id, 'adopt']);
    }
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // ============================================================
  // MÉTHODES D'AFFICHAGE
  // ============================================================

  getPetTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'CHIEN': '🐕 Dog',
      'CHAT': '🐈 Cat',
      'OISEAU': '🐦 Bird',
      'LAPIN': '🐇 Rabbit',
      'RONGEUR': '🐭 Rodent',
      'REPTILE': '🐍 Reptile',
      'POISSON': '🐟 Fish',
      'AUTRE': '🐾 Other'
    };
    return types[type] || type;
  }

  getPetSizeLabel(size: string): string {
    const sizes: { [key: string]: string } = {
      'PETIT': 'Small',
      'MOYEN': 'Medium',
      'GRAND': 'Large',
      'TRES_GRAND': 'Extra Large'
    };
    return sizes[size] || size;
  }

  getAgeText(age?: number): string {
    if (!age) return 'Age not specified';
    const years = Math.floor(age / 12);
    const months = age % 12;
    if (years === 0) return `${months} month${months > 1 ? 's' : ''}`;
    if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`;
  }

  getFirstPhoto(photos: string | null | undefined): string {
    if (!photos) return '';
    try {
      const photoArray = JSON.parse(photos);
      if (Array.isArray(photoArray) && photoArray.length > 0) {
        return photoArray[0];
      }
    } catch {
      return photos;
    }
    return '';
  }
}