import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService, Contract } from '../../services/admin.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-contract-management',
  templateUrl: './contract-management.component.html',
  styleUrls: ['./contract-management.component.css']
})
export class ContractManagementComponent implements OnInit {
  contracts: Contract[] = [];
  filteredContracts: Contract[] = [];
  loading = true;
  error: string | null = null;
  downloadingId: number | null = null;

  statusFilter = 'ALL';
  searchTerm = '';

  constructor(
    private adminService: AdminService,
    private confirmDialogService: ConfirmDialogService,
    private uiToastService: UiToastService
  ) {}

  ngOnInit(): void {
    this.loadContracts();
  }

  loadContracts(): void {
    this.loading = true;
    this.adminService.getAllContracts().subscribe({
      next: (data) => {
        this.contracts = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading contracts';
        this.loading = false;
        console.error(err);
      }
    });
  }

  applyFilters(): void {
    this.filteredContracts = this.contracts.filter((contract) => {
      if (this.statusFilter !== 'ALL' && contract.statut !== this.statusFilter) {
        return false;
      }
      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        return contract.animalName?.toLowerCase().includes(search)
          || contract.adoptantName?.toLowerCase().includes(search)
          || contract.numeroContrat?.toLowerCase().includes(search);
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

  async updateStatus(contract: Contract, event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;

    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Change contract status to "${newStatus}"?`,
      {
        title: 'Confirm status change',
        confirmText: 'Update',
        cancelText: 'Cancel',
        tone: 'neutral'
      }
    ));

    if (!confirmed) {
      selectElement.value = contract.statut;
      return;
    }

    this.adminService.updateContractStatus(contract.id, newStatus).subscribe({
      next: () => {
        this.loadContracts();
        this.uiToastService.success(`Contract status updated to ${newStatus}.`, 'Contract updated');
      },
      error: (err) => {
        this.uiToastService.error('Failed to update contract status.');
        console.error(err);
      }
    });
  }

  downloadPdf(contract: Contract): void {
    this.downloadingId = contract.id;
    this.adminService.downloadContractPdf(contract.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${contract.numeroContrat}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingId = null;
      },
      error: (err) => {
        this.uiToastService.error('Failed to download contract PDF.');
        this.downloadingId = null;
        console.error(err);
      }
    });
  }

  async deleteContract(contract: Contract): Promise<void> {
    const confirmed = await firstValueFrom(this.confirmDialogService.confirm(
      `Are you sure you want to delete contract ${contract.numeroContrat}? This action cannot be undone.`,
      {
        title: 'Delete contract',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        tone: 'danger'
      }
    ));

    if (!confirmed) {
      return;
    }

    this.adminService.deleteContract(contract.id).subscribe({
      next: () => {
        this.loadContracts();
        this.uiToastService.success('Contract deleted successfully.');
      },
      error: (err) => {
        this.uiToastService.error('Failed to delete contract.');
        console.error(err);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIF': return 'status-active';
      case 'BROUILLON': return 'status-draft';
      case 'SIGNE': return 'status-signed';
      case 'TERMINE': return 'status-completed';
      case 'RESILIE': return 'status-terminated';
      case 'ANNULE': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'ACTIF': return 'Active';
      case 'BROUILLON': return 'Draft';
      case 'SIGNE': return 'Signed';
      case 'TERMINE': return 'Completed';
      case 'RESILIE': return 'Terminated';
      case 'ANNULE': return 'Cancelled';
      default: return status;
    }
  }

  getAvailableStatuses(currentStatus: string): string[] {
    const allStatuses = ['ACTIF', 'TERMINE', 'RESILIE', 'ANNULE'];
    return allStatuses.filter((s) => s !== currentStatus);
  }
}
