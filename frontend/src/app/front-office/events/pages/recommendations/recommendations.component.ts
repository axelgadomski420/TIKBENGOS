import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { RecommendationService } from '../../services/recommendation.service';
import { EventRecommendation, EventSummary } from '../../models/event.models';
import { AuthService } from '../../../../auth/auth.service';
import { EventToastContainerComponent } from '../../components/event-toast-container/event-toast-container.component';
import { EventToastService } from '../../services/event-toast.service';

type PageState = 'loading' | 'done' | 'empty' | 'error' | 'not-logged-in';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, MatIconModule, EventToastContainerComponent],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.css']
})
export class RecommendationsComponent implements OnInit, OnDestroy {
  recommendations: EventRecommendation[] = [];
  pageState: PageState = 'loading';
  errorMessage = '';
  userId: number | null = null;

  get loading(): boolean {
    return this.pageState === 'loading';
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private recommendationService: RecommendationService,
    private authService: AuthService,
    private router: Router,
    private eventToast: EventToastService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser?.();
    this.userId = currentUser?.id ?? this.getUserIdFromStorage();

    if (!this.userId) {
      this.pageState = 'not-logged-in';
      return;
    }

    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getUserIdFromStorage(): number | null {
    const keysToTry = ['currentUser', 'user', 'auth_user', 'userData', 'authUser', 'token'];

    for (const key of keysToTry) {
      try {
        const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw);
        const id = parsed?.id ?? parsed?.userId ?? parsed?.user?.id ?? null;
        if (id && !Number.isNaN(Number(id))) {
          return Number(id);
        }
      } catch {
      }
    }

    return null;
  }

  loadRecommendations(): void {
    if (!this.userId) {
      this.pageState = 'not-logged-in';
      return;
    }

    this.pageState = 'loading';

    this.recommendationService
      .getPersonalizedRecommendations(this.userId, 20)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (this.pageState === 'loading') {
            this.pageState = 'error';
            this.errorMessage = 'We could not load recommendations right now.';
          }
        })
      )
      .subscribe({
        next: (recommendations) => {
          this.recommendations = recommendations ?? [];
          this.pageState = this.recommendations.length > 0 ? 'done' : 'empty';
        },
        error: (error) => {
          if (error.status === 401 || error.status === 403) {
            this.pageState = 'not-logged-in';
            this.errorMessage = 'Please sign in again to access personalized recommendations.';
            this.eventToast.warning('Session expired', this.errorMessage);
            return;
          }

          this.errorMessage = 'We could not load recommendations right now. Please try again shortly.';
          this.pageState = 'error';
          this.eventToast.error('Recommendations unavailable', this.errorMessage);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/app/events']);
  }

  openEvent(id: number): void {
    this.router.navigate(['/app/events', id]);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  retry(): void {
    this.loadRecommendations();
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  }

  fillPercentage(event: EventSummary): number {
    if (!event.maxParticipants) return 0;
    return Math.round(((event.maxParticipants - event.remainingSlots) / event.maxParticipants) * 100);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  trackRec(_: number, recommendation: EventRecommendation): number {
    return recommendation.event?.id ?? _;
  }
}
