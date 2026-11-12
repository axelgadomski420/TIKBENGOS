import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService, AdoptionRequest } from '../../services/admin.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-request-management',
  templateUrl: './request-management.component.html',
  styleUrls: ['./request-management.component.css']
})
export class RequestManagementComponent implements OnInit {
  requests: AdoptionRequest[] = [];
  filteredRequests: AdoptionRequest[] = [];
  loading = true;
  error: string | null = null;

  statusFilter = 'ALL';
  searchTerm = '';

  showRejectModal = false;
  selectedRequest: AdoptionRequest | null = null;
  rejectionReason = '';

  constructor(
    private adminService: AdminService,
    private confirmDialogService: ConfirmDialogService,
    private uiToastService: UiToastService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.adminService.getAllRequests().subscribe({
      next: (data) => {
        this.requests = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading requests';
        this.loading = false;
        console.error(err);
      }
    });
  }

  applyFilters(): void {
    this.filteredRequests = this.requests.filter((request) => {
      if (this.statusFilter !== 'ALL' && request.status !== this.statusFilter) {
        return false;
      }
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        return request.petName?.toLowerCase().includes(search)
          || request.adopterName?.toLowerCase().includes(search);
      }
      return true;
    });
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  async approveRequest(request: AdoptionRequest): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Approve adoption request for "${request.petName}"?`,
      {
        title: 'Approve request',
        confirmText: 'Approve',
        cancelText: 'Cancel',
        tone: 'neutral'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.updateRequestStatus(request.id, 'APPROVED').subscribe({
      next: () => {
        this.loadRequests();
        this.uiToastService.success('Request approved successfully.');
      },
      error: (err) => {
        this.uiToastService.error('Error approving request.');
        console.error(err);
      }
    });
  }

  openRejectModal(request: AdoptionRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.selectedRequest) {
      return;
    }

    this.adminService.updateRequestStatus(
      this.selectedRequest.id,
      'REJECTED',
      this.rejectionReason
    ).subscribe({
      next: () => {
        this.loadRequests();
        this.showRejectModal = false;
        this.selectedRequest = null;
        this.rejectionReason = '';
        this.uiToastService.info('Request rejected.');
      },
      error: (err) => {
        this.uiToastService.error('Error rejecting request.');
        console.error(err);
      }
    });
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectionReason = '';
  }

  async deleteRequest(request: AdoptionRequest): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Are you sure you want to delete request for "${request.petName}"? This action cannot be undone.`,
      {
        title: 'Delete request',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.deleteRequest(request.id).subscribe({
      next: () => {
        this.loadRequests();
        this.uiToastService.success('Request deleted successfully.');
      },
      error: (err) => {
        this.uiToastService.error('Error deleting request.');
        console.error(err);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      case 'UNDER_REVIEW': return 'status-review';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      case 'UNDER_REVIEW': return 'Under Review';
      default: return status;
    }
  }
}
