import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { MarketplaceReclamation, MarketplaceReclamationService } from '../../../shared/services/marketplace-reclamation.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-marketplace-reclamations',
  templateUrl: './reclamations.component.html',
  styleUrl: './reclamations.component.css'
})
export class ReclamationsComponent implements OnInit {
  loading = false;
  currentUserId: number | null = null;
  reclamations: MarketplaceReclamation[] = [];
  loadError = '';

  constructor(
    private readonly authService: AuthService,
    private readonly reclamationService: MarketplaceReclamationService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id ?? null;

    if (!this.currentUserId) {
      this.loadError = 'Please login to submit and track marketplace reclamations.';
      this.dialogService.openWarning('Login required', this.loadError);
      return;
    }

    this.refreshAll();
  }

  refreshAll(): void {
    if (!this.currentUserId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.reclamationService.getByUser(this.currentUserId).subscribe({
      next: (reclamations) => {
        this.reclamations = reclamations;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.error || 'Failed to load reclamations';
        this.toastr.error(this.loadError, 'Reclamations load failed');
        this.loading = false;
      }
    });
  }

  goToCreatePage(): void {
    this.router.navigate(['/app/marketplace/reclamations/new']);
  }

  goToEditPage(reclamation: MarketplaceReclamation): void {
    this.router.navigate(['/app/marketplace/reclamations', reclamation.id, 'edit']);
  }

  getReclamationImageUrl(reclamation: MarketplaceReclamation): string {
    return this.reclamationService.getImageUrl(reclamation.id);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'RESOLVED':
        return 'reclamation-status-success';
      case 'REJECTED':
        return 'reclamation-status-danger';
      case 'IN_REVIEW':
        return 'reclamation-status-warning';
      default:
        return 'reclamation-status-neutral';
    }
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  }
}
