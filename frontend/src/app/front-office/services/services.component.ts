import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ServiceService, Service, RecommendedServiceDTO, ServiceReview } from './service/service.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  recommendations: RecommendedServiceDTO[] = [];

  loading = false;
  loadingRecommendations = false;
  error = '';

  // ─── Provider banner ─────────────────────────────────────────────────────────
  /** NONE | PENDING | APPROVED | REJECTED */
  providerRequestStatus: string = 'NONE';
  providerBannerLoading = true;

  // Search / filter state
  searchQuery = '';
  selectedCategory = '';

  // ─── Review Modal ────────────────────────────────────────────────────────────
  showReviewModal = false;
  selectedService: Service | null = null;
  serviceReviews: ServiceReview[] = [];
  loadingReviews = false;
  submittingReview = false;
  reviewError = '';
  reviewSuccess = '';
  alreadyReviewed = false;

  // New review form state
  newReviewRating = 0;
  hoveredStar = 0;
  newReviewComment = '';

  constructor(
    private serviceService: ServiceService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadServices();
    this.loadRecommendations();
    this.loadProviderStatus();
  }

  // ─── Provider banner ─────────────────────────────────────────────────────────
  loadProviderStatus(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role === 'ADMIN' || user.role === 'SHELTER') {
      this.providerBannerLoading = false;
      return;
    }
    this.http.get<any>(`http://localhost:8087/elif/api/provider-request/me/${user.id}`).subscribe({
      next: (res) => {
        this.providerRequestStatus = res?.status || 'NONE';
        this.providerBannerLoading = false;
      },
      error: () => {
        this.providerRequestStatus = 'NONE';
        this.providerBannerLoading = false;
      }
    });
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  /** Show the banner for USER role only (not already SERVICE_PROVIDER, not ADMIN, not SHELTER) */
  get showProviderBanner(): boolean {
    const role = this.currentUser?.role?.toUpperCase();
    return !!this.currentUser && role === 'USER' && !this.providerBannerLoading;
  }

  goToProviderRequest(): void {
    this.router.navigate(['/admin/services/provider-request']);
  }

  // ─── Services ───────────────────────────────────────────────────────────────
  loadServices(): void {
    this.loading = true;
    this.serviceService.findAll().subscribe({
      next: (data) => {
        this.services = data;
        this.filteredServices = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur lors de la récupération des services';
        this.loading = false;
      }
    });
  }

  // ─── Smart Recommendations ──────────────────────────────────────────────────
  loadRecommendations(): void {
    this.loadingRecommendations = true;
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id ?? undefined;

    this.serviceService.getRecommendations(userId, undefined, undefined).subscribe({
      next: (data) => {
        this.recommendations = data;
        this.loadingRecommendations = false;
      },
      error: (err) => {
        console.error('Failed to load recommendations', err);
        this.loadingRecommendations = false;
      }
    });
  }

  // ─── Search & Filter ────────────────────────────────────────────────────────
  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    const cat = this.selectedCategory.toLowerCase().trim();

    this.filteredServices = this.services.filter(s => {
      const matchName = !q || s.name.toLowerCase().includes(q) || (s.clinicName || '').toLowerCase().includes(q);
      const matchCat = !cat || (s.category?.name || '').toLowerCase().includes(cat);
      return matchName && matchCat;
    });
  }

  onCategoryChange(value: string): void {
    this.selectedCategory = value;
    this.onSearch();
  }

  // ─── Review Modal ────────────────────────────────────────────────────────────
  openReviewModal(service: Service): void {
    this.selectedService = service;
    this.showReviewModal = true;
    this.newReviewRating = 0;
    this.hoveredStar = 0;
    this.newReviewComment = '';
    this.reviewError = '';
    this.reviewSuccess = '';
    this.alreadyReviewed = false;
    this.serviceReviews = [];
    this.loadReviews(service.id);
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedService = null;
  }

  loadReviews(serviceId: number): void {
    this.loadingReviews = true;
    this.serviceService.getReviews(serviceId).subscribe({
      next: (reviews) => {
        this.serviceReviews = reviews;
        this.loadingReviews = false;
        // Check if current user already reviewed
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.alreadyReviewed = reviews.some(r => r.userId === currentUser.id);
        }
      },
      error: () => {
        this.loadingReviews = false;
      }
    });
  }

  setHoveredStar(star: number): void {
    this.hoveredStar = star;
  }

  setRating(star: number): void {
    this.newReviewRating = star;
  }

  getStarState(star: number): 'active' | 'hover' | 'empty' {
    if (star <= this.newReviewRating) return 'active';
    if (star <= this.hoveredStar) return 'hover';
    return 'empty';
  }

  submitReview(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.reviewError = 'Vous devez être connecté pour laisser un avis.';
      return;
    }
    if (this.newReviewRating === 0) {
      this.reviewError = 'Veuillez sélectionner une note (1 à 5 étoiles).';
      return;
    }
    if (!this.selectedService) return;

    this.submittingReview = true;
    this.reviewError = '';

    const review: ServiceReview = {
      userId: currentUser.id,
      rating: this.newReviewRating,
      comment: this.newReviewComment.trim() || undefined
    };

    this.serviceService.addReview(this.selectedService.id, review).subscribe({
      next: (saved) => {
        this.submittingReview = false;
        this.reviewSuccess = 'Merci pour votre avis ! ⭐';
        this.alreadyReviewed = true;
        this.newReviewRating = 0;
        this.newReviewComment = '';

        // Prepend to reviews list
        this.serviceReviews = [saved, ...this.serviceReviews];

        // Update the service rating locally
        if (this.selectedService) {
          const serviceInList = this.services.find(s => s.id === this.selectedService!.id);
          if (serviceInList && saved) {
            serviceInList.ratingCount = (serviceInList.ratingCount || 0) + 1;
            const totalRating = (serviceInList.rating || 0) * (serviceInList.ratingCount - 1) + this.newReviewRating;
            serviceInList.rating = Math.round((totalRating / serviceInList.ratingCount) * 10) / 10;
          }
          // reload actual value
          this.loadServices();
        }
      },
      error: (err) => {
        this.submittingReview = false;
        if (err.status === 409) {
          this.reviewError = 'Vous avez déjà laissé un avis pour ce service.';
          this.alreadyReviewed = true;
        } else {
          this.reviewError = 'Une erreur est survenue. Réessayez.';
        }
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  getStars(rating: number): string[] {
    const r = rating || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return [
      ...Array(full).fill('full'),
      ...Array(half).fill('half'),
      ...Array(empty).fill('empty')
    ];
  }

  getCategoryEmoji(catName: string): string {
    const map: Record<string, string> = {
      VETERINARY: '🩺', GROOMING: '✂️', TRAINING: '🎓',
      BOARDING: '🏠', HOTEL: '🏨', WALKING: '🚶'
    };
    return map[(catName || '').toUpperCase()] || '🐾';
  }

  get uniqueCategories(): string[] {
    const cats = this.services.map(s => s.category?.name).filter(Boolean) as string[];
    return [...new Set(cats)];
  }

  getReviewStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}