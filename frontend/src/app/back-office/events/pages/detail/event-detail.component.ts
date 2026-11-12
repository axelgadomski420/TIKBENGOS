// event-detail.component.ts - VERSION COMPLÈTE AVEC TRACKING

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { 
  AdminEventService, 
  AdminAuthService,
  AdminCapacityService,
  AdminParticipantService,
  AdminWaitlistService,
  AdminWeatherService,
  AdminReviewService,
  AdminExportService
} from '../../services/admin-api.service';
import { EventDetail, EventCapacityResponse, EventParticipantResponse, WaitlistResponse, WeatherResponse, EventReviewResponse, EventSummary } from '../../models/admin-events.models';
import { AdminVirtualSessionComponent } from '../../components/admin-virtual-session/admin-virtual-session.component';
import { AdminToastContainerComponent } from '../../components/admin-toast-container/admin-toast-container.component';
import { AdminToastService } from '../../services/admin-toast.service';
import { PopularityTrackingService } from '../../services/popularity-tracking.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, MatIconModule, AdminVirtualSessionComponent, AdminToastContainerComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  
  event: EventDetail | null = null;
  loading = true;
  error = '';
  
  // Modals
  activeTab: 'info' | 'participants' | 'waitlist' | 'reviews' | 'weather' | 'virtual' = 'info';
  activeModal: 'capacity' | 'participants' | 'waitlist' | 'reviews' | 'weather' | 'reminders' | 'rules' | 'addRule' | 'competitionEntries' | null = null;
  selectedEvent: EventSummary | null = null;
  modalLoading = false;
  
  // Participants
  participants: EventParticipantResponse[] = [];
  pendingList: EventParticipantResponse[] = [];
  loadingParticipants = false;
  
  // Waitlist
  waitlist: WaitlistResponse[] = [];
  loadingWaitlist = false;
  
  // Capacity
  capacityData: EventCapacityResponse | null = null;
  loadingCapacity = false;
  
  // Weather
  weather: WeatherResponse | null = null;
  loadingWeather = false;
  
  // Reviews
  reviews: EventReviewResponse[] = [];
  loadingReviews = false;
  
  // Export
  exporting = false;
  
  // Actions
  showConfirmDialog = false;
  confirmAction: { title: string; message: string; action: () => void } | null = null;

  statusLabels: Record<string, string> = {
    PLANNED: 'Planned',
    ONGOING: 'Ongoing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    FULL: 'Full'
  };

  statusColors: Record<string, string> = {
    PLANNED: '#2ea46c',
    ONGOING: '#f59e0b',
    COMPLETED: '#3b82f6',
    CANCELLED: '#ef4444',
    FULL: '#a855f7'
  };

  weatherIcons: Record<string, string> = {
    SUNNY: '☀️',
    CLOUDY: '⛅',
    RAINY: '🌧️',
    STORMY: '⛈️',
    SNOWY: '❄️',
    UNKNOWN: '🌤️'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: AdminEventService,
    private capacityService: AdminCapacityService,
    private participantService: AdminParticipantService,
    private waitlistService: AdminWaitlistService,
    private weatherService: AdminWeatherService,
    private reviewService: AdminReviewService,
    private exportService: AdminExportService,
    private auth: AdminAuthService,
    private toastService: AdminToastService,
    private tracking: PopularityTrackingService  // ✅ AJOUTÉ
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const eventId = +id;
      this.loadEvent(eventId);
      
      // ✅ Tracker l'ouverture de la page détail (admin)
      const adminId = this.auth.getAdminId();
      this.tracking.track(eventId, 'DETAIL_OPEN', adminId);
    } else {
      this.error = 'Event ID not found';
      this.loading = false;
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getAdminId(): number {
    return this.auth.getAdminId();
  }

  openCertificate(eventId: number, userId: number): void {
    const url = `http://localhost:8087/elif/api/certificates/${eventId}/${userId}`;
    window.open(url, '_blank');
  }

  private toastSuccess(title: string, message: string) {
    this.toastService.success(title, message);
  }

  private toastError(title: string, message: string) {
    this.toastService.error(title, message);
  }

  private toastWarning(title: string, message: string) {
    this.toastService.warning(title, message);
  }

  private toastInfo(title: string, message: string) {
    this.toastService.info(title, message);
  }

  loadEvent(id: number) {
    this.loading = true;
    this.eventService.getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (e) => {
          this.event = e;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading event', err);
          this.error = 'Failed to load event details';
          this.loading = false;
        }
      });
  }

  // Tabs
  setTab(tab: 'info' | 'participants' | 'waitlist' | 'reviews' | 'weather' | 'virtual') {
    this.activeTab = tab;
    
    if (tab === 'participants') this.loadParticipants();
    if (tab === 'waitlist') this.loadWaitlist();
    if (tab === 'reviews') this.loadReviews();
    if (tab === 'weather') this.loadWeather();
    if (tab === 'info') this.loadCapacity();
  }
  
  loadCapacity() {
    if (!this.event) return;
    this.loadingCapacity = true;
    this.capacityService.getSnapshot(this.event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (c) => {
          this.capacityData = c;
          this.loadingCapacity = false;
        },
        error: () => {
          this.loadingCapacity = false;
        }
      });
  }

  loadParticipants() {
    if (!this.event) return;
    this.loadingParticipants = true;
    
    this.participantService.getConfirmed(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.participants = r.content;
        },
        error: () => {}
      });
    
    this.participantService.getPending(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.pendingList = r.content;
          this.loadingParticipants = false;
        },
        error: () => {
          this.loadingParticipants = false;
        }
      });
  }

  loadWaitlist() {
    if (!this.event) return;
    this.loadingWaitlist = true;
    this.waitlistService.getWaitlist(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.waitlist = r.content;
          this.loadingWaitlist = false;
        },
        error: () => {
          this.loadingWaitlist = false;
        }
      });
  }

  loadReviews() {
    if (!this.event) return;
    this.loadingReviews = true;
    this.reviewService.getReviews(this.event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.reviews = r.content;
          this.loadingReviews = false;
        },
        error: () => {
          this.loadingReviews = false;
        }
      });
  }

  loadWeather() {
    if (!this.event) return;
    this.loadingWeather = true;
    this.weatherService.getForEvent(this.event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (w) => {
          this.weather = w;
          this.loadingWeather = false;
        },
        error: () => {
          this.weather = null;
          this.loadingWeather = false;
          this.toastWarning('Weather unavailable', 'Live weather data is not available for this event yet.');
        }
      });
  }

  // Participant actions
  approveParticipant(p: EventParticipantResponse) {
    this.participantService.approve(p.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadParticipants();
          this.loadCapacity();
          this.toastSuccess('Approved', `${p.userName} has been approved successfully.`);
        },
        error: () => this.toastError('Approval failed', `Unable to approve ${p.userName} right now.`)
      });
  }

  rejectParticipant(p: EventParticipantResponse) {
    this.participantService.reject(p.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadParticipants();
          this.toastInfo('Rejected', `${p.userName} has been rejected.`);
        },
        error: () => this.toastError('Rejection failed', `Unable to reject ${p.userName} right now.`)
      });
  }

  // ✅ WAITLIST ACTIONS - AVEC MESSAGES PROFESSIONNELS
  promoteNext() {
    if (!this.event) return;
    
    // Vérifier s'il y a des places disponibles
    if (this.capacityData && this.capacityData.remainingSlots <= 0) {
      this.toastWarning(
        'Cannot promote',
        `"${this.event.title}" is currently at full capacity (${this.capacityData.confirmedParticipants}/${this.capacityData.maxParticipants}). The waitlist will be processed automatically when a spot becomes available.`
      );
      return;
    }
    
    // Vérifier s'il y a des personnes en liste d'attente
    if (!this.waitlist || this.waitlist.length === 0) {
      this.toastInfo(
        'Waitlist empty',
        `No users are currently on the waitlist for "${this.event.title}".`
      );
      return;
    }
    
    this.waitlistService.promoteNext(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result && result.promoted) {
            this.toastSuccess(
              'Promotion successful',
              `The next user on the waitlist has been notified and can confirm their spot.`
            );
            this.loadWaitlist();
            this.loadCapacity();
            this.loadParticipants();
          } else {
            this.toastInfo(
              'Auto-promotion active',
              `The system will automatically promote the next user when a spot becomes available. Manual promotion is not needed.`
            );
          }
        },
        error: (err) => {
          this.toastError(
            'Promotion failed',
            err?.error?.message || 'Unable to promote user. Please try again or contact support.'
          );
        }
      });
  }

  // Recalculate capacity
  recalculateCapacity() {
    if (!this.event) return;
    this.capacityService.recalculate(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (c) => {
          this.capacityData = c;
          this.loadEvent(this.event!.id);
          this.toastSuccess(
            'Capacity updated',
            `Remaining slots: ${c.remainingSlots} | Fill rate: ${c.fillRatePercent}%`
          );
        },
        error: () => this.toastError('Update failed', 'Capacity could not be recalculated right now.')
      });
  }

  // Export
  exportParticipants() {
    if (!this.event) return;
    this.exporting = true;
    this.exportService.exportParticipants(this.event.id, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const safeTitle = this.event!.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          this.exportService.downloadBlob(blob, `participants_${safeTitle}_${this.today()}.csv`);
          this.exporting = false;
          this.toastSuccess('Export complete', 'Participants list has been exported to CSV.');
        },
        error: () => {
          this.exporting = false;
          this.toastError('Export failed', 'Unable to export participants. Please try again.');
        }
      });
  }

  // Cancel event
  confirmCancel() {
    this.confirmAction = {
      title: 'Cancel Event',
      message: `Are you sure you want to cancel "${this.event?.title}"? All participants will be notified.`,
      action: () => {
        if (!this.event) return;
        this.eventService.cancel(this.event.id, this.auth.getAdminId())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadEvent(this.event!.id);
              this.closeConfirm();
              this.toastSuccess('Event Cancelled', `"${this.event!.title}" has been cancelled.`);
            },
            error: () => this.toastError('Cancellation failed', `Unable to cancel "${this.event!.title}" right now.`)
          });
      }
    };
    this.showConfirmDialog = true;
  }

  // Delete event
  confirmDelete() {
    this.confirmAction = {
      title: 'Delete Event',
      message: `This action is irreversible. Delete "${this.event?.title}" permanently?`,
      action: () => {
        if (!this.event) return;
        this.eventService.delete(this.event.id, this.auth.getAdminId())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastSuccess('Event Deleted', `"${this.event!.title}" has been permanently deleted.`);
              setTimeout(() => this.router.navigate(['/admin/events']), 350);
            },
            error: () => this.toastError('Deletion failed', `Unable to delete "${this.event!.title}" right now.`)
          });
      }
    };
    this.showConfirmDialog = true;
  }

  closeConfirm() {
    this.showConfirmDialog = false;
    this.confirmAction = null;
  }

  // Delete review
  deleteReview(reviewId: number) {
    this.reviewService.deleteReview(reviewId, this.auth.getAdminId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.reviews = this.reviews.filter(r => r.id !== reviewId);
          this.toastSuccess('Review Deleted', 'The review has been successfully removed.');
        },
        error: () => this.toastError('Delete failed', 'Unable to delete the review. Please try again.')
      });
  }

  // Navigation
  goBack() {
    this.router.navigate(['/admin/events']);
  }

  goToEdit() {
    if (!this.event) return;
    this.router.navigate(['/admin/events', this.event.id, 'edit']);
  }

  // Helpers
  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canCancel(): boolean {
    if (!this.event) return false;
    return !['CANCELLED', 'COMPLETED'].includes(this.event.status);
  }

  getFillRate(): number {
    if (!this.capacityData) return 0;
    return this.capacityData.fillRatePercent;
  }

  closeModal() {
    this.activeModal = null;
    this.selectedEvent = null;
    this.modalLoading = false;
  }
}
