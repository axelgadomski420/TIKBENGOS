import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-shelter-detail',
  templateUrl: './shelter-detail.component.html',
  styleUrls: ['./shelter-detail.component.css']
})
export class ShelterDetailComponent implements OnInit {
  shelter: any = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private confirmDialogService: ConfirmDialogService,
    private uiToastService: UiToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.loadShelter(id);
    }
  }

  loadShelter(id: number): void {
    this.loading = true;
    this.adminService.getShelterById(id).subscribe({
      next: (data) => {
        this.shelter = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading shelter details';
        this.loading = false;
        console.error(err);
      }
    });
  }

  async confirmApprove(): Promise<void> {
    if (!this.shelter?.userId) {
      this.uiToastService.error('Cannot find user ID for this shelter.');
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Are you sure you want to approve "${this.shelter.name}"?`,
      {
        title: 'Approve shelter',
        confirmText: 'Approve',
        cancelText: 'Cancel',
        tone: 'neutral'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.approveShelter(this.shelter.userId).subscribe({
      next: () => {
        this.uiToastService.success('Shelter approved successfully.');
        this.router.navigate(['/admin/adoption/shelters']);
      },
      error: (err) => {
        this.uiToastService.error(`Error approving shelter: ${err.error?.message || 'Unknown error'}`);
      }
    });
  }

  approveShelter(): void {
    if (!this.shelter?.userId) {
      this.uiToastService.error('Cannot find user ID for this shelter.');
      return;
    }

    this.adminService.approveShelter(this.shelter.userId).subscribe({
      next: () => {
        this.uiToastService.success('Shelter approved successfully.');
        this.router.navigate(['/admin/adoption/shelters']);
      },
      error: (err) => {
        this.uiToastService.error(`Error approving shelter: ${err.error?.message || 'Unknown error'}`);
      }
    });
  }

  async rejectShelter(): Promise<void> {
    if (!this.shelter?.userId) {
      this.uiToastService.error('Cannot find user ID for this shelter.');
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      'Are you sure you want to reject this shelter? This will delete the account.',
      {
        title: 'Reject shelter',
        confirmText: 'Reject',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.rejectShelter(this.shelter.userId).subscribe({
      next: () => {
        this.uiToastService.success('Shelter rejected and removed.');
        this.router.navigate(['/admin/adoption/shelters']);
      },
      error: () => {
        this.uiToastService.error('Error rejecting shelter.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/adoption/shelters']);
  }
}
