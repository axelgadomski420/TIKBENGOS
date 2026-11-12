import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-shelter-management',
  templateUrl: './shelter-management.component.html',
  styleUrls: ['./shelter-management.component.css']
})
export class ShelterManagementComponent implements OnInit {
  shelters: any[] = [];
  pendingShelters: any[] = [];
  loading = true;
  error: string | null = null;
  submitting = false;

  editingShelter: any | null = null;
  editForm: FormGroup;

  showAddModal = false;
  addForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder,
    private router: Router,
    private confirmDialogService: ConfirmDialogService,
    private uiToastService: UiToastService
  ) {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      description: [''],
      logoUrl: ['']
    });

    this.addForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      licenseNumber: [''],
      description: [''],
      logoUrl: [''],
      verified: [false]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.adminService.getAllShelters().subscribe({
      next: (data) => {
        this.shelters = data;
        this.pendingShelters = data.filter((s: any) => !s.verified);
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Error loading shelters';
        this.loading = false;
        console.error(err);
      }
    });
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.addForm.reset({ verified: false });
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addForm.reset();
    this.submitting = false;
  }

  submitAddShelter(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const shelterData = this.addForm.value;

    this.adminService.createShelter(shelterData).subscribe({
      next: () => {
        this.uiToastService.success('Shelter created successfully.');
        this.loadData();
        this.closeAddModal();
      },
      error: (err: any) => {
        this.uiToastService.error(`Error creating shelter: ${err.error?.message || 'Unknown error'}`);
        console.error(err);
        this.submitting = false;
      }
    });
  }

  async approveShelter(shelter: any): Promise<void> {
    if (!shelter.userId) {
      this.router.navigate(['/admin/adoption/shelters', shelter.id]);
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Approve shelter "${shelter.name}"? This will activate the shelter.`,
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

    this.adminService.approveShelter(shelter.userId).subscribe({
      next: () => {
        this.uiToastService.success('Shelter approved successfully.');
        this.loadData();
      },
      error: (err: any) => {
        this.uiToastService.error(`Error approving shelter: ${err.error?.message || 'Unknown error'}`);
        console.error(err);
      }
    });
  }

  async rejectShelter(shelter: any): Promise<void> {
    const userId = shelter.userId;
    if (!userId) {
      this.uiToastService.error('Cannot find user ID for this shelter.');
      return;
    }

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Reject shelter "${shelter.name}"? This will delete the account.`,
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

    this.adminService.rejectShelter(userId).subscribe({
      next: () => {
        this.uiToastService.success('Shelter rejected and deleted.');
        this.loadData();
      },
      error: (err: any) => {
        this.uiToastService.error(`Error rejecting shelter: ${err.error?.message || 'Unknown error'}`);
        console.error(err);
      }
    });
  }

  startEdit(shelter: any): void {
    this.editingShelter = shelter;
    this.editForm.patchValue({
      name: shelter.name,
      address: shelter.address,
      phone: shelter.phone,
      email: shelter.email,
      description: shelter.description,
      logoUrl: shelter.logoUrl
    });
  }

  cancelEdit(): void {
    this.editingShelter = null;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const updatedShelter = { ...this.editingShelter, ...this.editForm.value };

    this.adminService.updateShelter(this.editingShelter.id, updatedShelter).subscribe({
      next: () => {
        this.uiToastService.success('Shelter updated successfully.');
        this.loadData();
        this.cancelEdit();
      },
      error: (err: any) => {
        this.uiToastService.error(`Error updating shelter: ${err.error?.message || 'Unknown error'}`);
        console.error(err);
      }
    });
  }

  async deleteShelter(shelter: any): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Delete shelter "${shelter.name}"? This action cannot be undone.`,
      {
        title: 'Delete shelter',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.deleteShelter(shelter.id).subscribe({
      next: () => {
        this.uiToastService.success('Shelter deleted successfully.');
        this.loadData();
      },
      error: (err: any) => {
        this.uiToastService.error(`Error deleting shelter: ${err.error?.message || 'Unknown error'}`);
        console.error(err);
      }
    });
  }

  viewShelterDetails(shelter: any): void {
    this.router.navigate(['/admin/adoption/shelters', shelter.id]);
  }

  get verifiedShelters(): any[] {
    return this.shelters.filter((s: any) => s.verified);
  }
}
