import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ShelterService } from '../../services/shelter.service';
import { Shelter } from '../../models/shelter.model';

@Component({
  selector: 'app-shelter-list',
  templateUrl: './shelter-list.component.html',
  styleUrls: ['./shelter-list.component.css']
})
export class ShelterListComponent implements OnInit {
  shelters: Shelter[] = [];
  loading = true;
  error: string | null = null;
  searchKeyword = '';

  constructor(
    private shelterService: ShelterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadShelters();
  }

  loadShelters(): void {
    this.loading = true;
    this.shelterService.getAll().subscribe({
      next: (data) => {
        this.shelters = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading shelters';
        this.loading = false;
        console.error(err);
      }
    });
  }

  search(): void {
    if (this.searchKeyword.trim()) {
      this.loading = true;
      this.shelterService.search(this.searchKeyword).subscribe({
        next: (data) => {
          this.shelters = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error searching shelters';
          this.loading = false;
        }
      });
    } else {
      this.loadShelters();
    }
  }

  resetSearch(): void {
    this.searchKeyword = '';
    this.loadShelters();
  }

  goToPets(): void {
  this.router.navigate(['/app/adoption/pets']);
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
}