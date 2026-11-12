import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, Statistics } from '../../services/admin.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {
  stats: Statistics | null = null;
  loading = true;
  error: string | null = null;

  private categoryColors: { [key: string]: string } = {
    'CHIEN': '#3b82f6',
    'CHAT': '#f59e0b',
    'LAPIN': '#8b5cf6',
    'OISEAU': '#ec489a',
    'RONGEUR': '#14b8a6',
    'REPTILE': '#ef4444',
    'AUTRE': '#6b7280'
  };

  private categoryEmojis: { [key: string]: string } = {
    'CHIEN': '🐕',
    'CHAT': '🐈',
    'LAPIN': '🐇',
    'OISEAU': '🐦',
    'RONGEUR': '🐭',
    'REPTILE': '🐍',
    'AUTRE': '🐾'
  };

  private categoryLabels: { [key: string]: string } = {
    'CHIEN': 'Dogs',
    'CHAT': 'Cats',
    'LAPIN': 'Rabbits',
    'OISEAU': 'Birds',
    'RONGEUR': 'Rodents',
    'REPTILE': 'Reptiles',
    'AUTRE': 'Other'
  };

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading = true;
    this.adminService.getStatistics().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading statistics';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goToShelters(): void {
    this.router.navigate(['/admin/adoption/shelters']);
  }

  goToPets(): void {
    this.router.navigate(['/admin/adoption/pets']);
  }

  goToRequests(): void {
    this.router.navigate(['/admin/adoption/requests']);
  }

  goToContracts(): void {
    this.router.navigate(['/admin/adoption/contracts']);
  }

  goToReviews(): void {
    this.router.navigate(['/admin/adoption/reviews']);
  }

  getPetPercentage(status: string): number {
    if (!this.stats) return 0;
    if (status === 'available' && this.stats.totalPets > 0) {
      return (this.stats.availablePets / this.stats.totalPets) * 100;
    }
    if (status === 'adopted' && this.stats.totalPets > 0) {
      return (this.stats.adoptedPets / this.stats.totalPets) * 100;
    }
    return 0;
  }

  getRequestPercentage(status: string): number {
    if (!this.stats || this.stats.totalAdoptionRequests === 0) return 0;
    switch (status) {
      case 'pending': return (this.stats.pendingRequests / this.stats.totalAdoptionRequests) * 100;
      case 'approved': return (this.stats.approvedRequests / this.stats.totalAdoptionRequests) * 100;
      case 'rejected': return (this.stats.rejectedRequests / this.stats.totalAdoptionRequests) * 100;
      default: return 0;
    }
  }

  getShelterPercentage(status: string): number {
    if (!this.stats || this.stats.totalShelters === 0) return 0;
    if (status === 'verified') return (this.stats.verifiedShelters / this.stats.totalShelters) * 100;
    if (status === 'pending') return (this.stats.pendingShelters / this.stats.totalShelters) * 100;
    return 0;
  }

  getPetCategories(): any[] {
    if (!this.stats?.petsByCategory || !this.stats?.totalPets || this.stats.totalPets === 0) {
      return [];
    }

    return Object.entries(this.stats.petsByCategory)
      .map(([type, count]) => ({
        type: type,
        label: this.categoryLabels[type] || type,
        emoji: this.categoryEmojis[type] || '🐾',
        count: count,
        pct: Math.round((count / this.stats!.totalPets) * 100),
        color: this.categoryColors[type] || '#6b7280'
      }))
      .sort((a, b) => b.count - a.count);
  }

  getMostCommonCategory(): string {
    const categories = this.getPetCategories();
    if (categories.length === 0) return 'No data';
    return categories[0].label;
  }

  getCategoryCount(): number {
    return this.getPetCategories().length;
  }
}