import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShelterService } from '../../services/shelter.service';
import { PetService } from '../../services/pet.service';
import { Shelter } from '../../models/shelter.model';
import { AdoptionPet } from '../../models/adoption-pet.model';

@Component({
  selector: 'app-shelter-detail',
  templateUrl: './shelter-detail.component.html',
  styleUrls: ['./shelter-detail.component.css']
})
export class ShelterDetailComponent implements OnInit {
  shelter: Shelter | null = null;
  pets: AdoptionPet[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shelterService: ShelterService,
    private petService: PetService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadShelter(id);
      this.loadPets(id);
    } else {
      this.error = 'Shelter not found';
      this.loading = false;
    }
  }

  loadShelter(id: number): void {
    this.shelterService.getById(id).subscribe({
      next: (data) => {
        this.shelter = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading shelter';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadPets(shelterId: number): void {
    this.petService.getByShelter(shelterId).subscribe({
      next: (data) => {
        this.pets = data;
      },
      error: (err) => {
        console.error('Error loading pets:', err);
      }
    });
  }

  goBack(): void {
  this.router.navigate(['/app/adoption/shelters']);
}

  getStars(rating: number): string {
    if (!rating) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (halfStar) stars += '½';
    stars += '☆'.repeat(5 - Math.ceil(rating));
    return stars;
  }

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