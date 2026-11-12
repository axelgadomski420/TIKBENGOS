import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { RequestService } from '../../services/request.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.css']
})
export class MyRequestsComponent implements OnInit {
  requests: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private requestService: RequestService,
    private router: Router,
    private confirmDialogService: ConfirmDialogService,
    private uiToastService: UiToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadRequests(user.id);
  }

  loadRequests(userId: number): void {
    this.loading = true;
    this.requestService.getByAdopter(userId).subscribe({
      next: (data) => {
        this.requests = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading requests';
        this.loading = false;
        console.error(err);
      }
    });
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      PENDING: 'bg-warning text-dark',
      UNDER_REVIEW: 'bg-info text-dark',
      APPROVED: 'bg-success',
      REJECTED: 'bg-danger',
      CANCELLED: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  }

  getStatusText(status: string): string {
    const texts: any = {
      PENDING: 'Pending',
      UNDER_REVIEW: 'Under Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled'
    };
    return texts[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      PENDING: 'status-PENDING',
      UNDER_REVIEW: 'status-UNDER_REVIEW',
      APPROVED: 'status-APPROVED',
      REJECTED: 'status-REJECTED',
      CANCELLED: 'status-CANCELLED'
    };
    return classes[status] || 'status-PENDING';
  }

  getPetIcon(petName: string): string {
    return petName ? petName.charAt(0).toUpperCase() : 'P';
  }

  getHousingIcon(housingType: string): string {
    const icons: any = {
      APARTMENT: 'fa-building',
      HOUSE: 'fa-home',
      FARM: 'fa-tractor',
      OTHER: 'fa-question-circle'
    };
    return icons[housingType] || 'fa-home';
  }

  getStatusIcon(status: string): string {
    const icons: any = {
      PENDING: 'fa-clock',
      UNDER_REVIEW: 'fa-eye',
      APPROVED: 'fa-check-circle',
      REJECTED: 'fa-times-circle',
      CANCELLED: 'fa-ban'
    };
    return icons[status] || 'fa-question-circle';
  }

  goBack(): void {
    this.router.navigate(['/app/adoption/pets']);
  }

  goToPets(): void {
    this.router.navigate(['/adoption/pets']);
  }

  async cancelRequest(requestId: number): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      'Are you sure you want to cancel this adoption request?',
      {
        title: 'Cancel request',
        confirmText: 'Cancel request',
        cancelText: 'Keep request',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      this.requestService.cancel(requestId, user.id).subscribe({
        next: () => {
          this.uiToastService.success('Adoption request cancelled successfully.');
          this.loadRequests(user.id!);
        },
        error: (err) => {
          this.uiToastService.error('Error cancelling request.');
          console.error(err);
        }
      });
    }
  }
}
