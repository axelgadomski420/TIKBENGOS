import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContractService } from '../../services/contract.service';
import { AuthService } from '../../../../auth/auth.service';
import { UiToastService } from '../../../../shared/services/ui-toast.service';

@Component({
  selector: 'app-my-contracts',
  templateUrl: './my-contracts.component.html',
  styleUrls: ['./my-contracts.component.css']
})
export class MyContractsComponent implements OnInit {

  contracts: any[] = [];
  newContracts: Set<number> = new Set();
  loading = true;
  error: string | null = null;
  downloading: number | null = null;

  private SEEN_KEY = '';

  constructor(
    private contractService: ContractService,
    private authService: AuthService,
    private router: Router,
    private uiToastService: UiToastService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.SEEN_KEY = `seen_contracts_${user.id}`;
    this.loadContracts(user.id);
  }

  loadContracts(userId: number): void {
    this.loading = true;
    this.error = null;

    this.contractService.getByAdopter(userId).subscribe({
      next: (data) => {
        this.contracts = data;
        this.detectNewContracts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading contracts:', err);
        this.error = 'Error loading your contracts. Please try again.';
        this.loading = false;
      }
    });
  }

  private detectNewContracts(): void {
    const seenRaw = localStorage.getItem(this.SEEN_KEY);
    const seenIds: number[] = seenRaw ? JSON.parse(seenRaw) : [];

    this.newContracts = new Set(
      this.contracts
        .filter((c) => !seenIds.includes(c.id))
        .map((c) => c.id)
    );
  }

  markAsSeen(contractId: number): void {
    if (!this.newContracts.has(contractId)) return;
    this.newContracts.delete(contractId);

    const seenRaw = localStorage.getItem(this.SEEN_KEY);
    const seenIds: number[] = seenRaw ? JSON.parse(seenRaw) : [];
    if (!seenIds.includes(contractId)) seenIds.push(contractId);
    localStorage.setItem(this.SEEN_KEY, JSON.stringify(seenIds));
  }

  markAllAsSeen(): void {
    const allIds = this.contracts.map((c) => c.id);
    localStorage.setItem(this.SEEN_KEY, JSON.stringify(allIds));
    this.newContracts.clear();
  }

  isNew(contractId: number): boolean {
    return this.newContracts.has(contractId);
  }

  get newContractsCount(): number {
    return this.newContracts.size;
  }

  get hasNewContracts(): boolean {
    return this.newContracts.size > 0;
  }

  downloadPdf(contract: any): void {
    this.markAsSeen(contract.id);
    this.downloading = contract.id;

    this.contractService.downloadPdf(contract.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contract-${contract.numeroContrat || contract.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.downloading = null;
      },
      error: () => {
        this.uiToastService.error('Error downloading the contract PDF. Please try again.');
        this.downloading = null;
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getStatusLabel(statut: string): string {
    const map: any = {
      BROUILLON: 'Draft', ENVOYE: 'Sent',
      SIGNE: 'Signed', VALIDE: 'Validated',
      ACTIF: 'Active', TERMINE: 'Completed',
      RESILIE: 'Terminated', ANNULE: 'Cancelled'
    };
    return map[statut] || statut || 'Active';
  }

  getStatusClass(statut: string): string {
    const map: any = {
      BROUILLON: 'status-draft', ENVOYE: 'status-sent',
      SIGNE: 'status-signed', VALIDE: 'status-valid',
      ACTIF: 'status-active', TERMINE: 'status-done',
      RESILIE: 'status-terminated', ANNULE: 'status-cancelled'
    };
    return map[statut] || 'status-active';
  }

  goBack(): void {
    this.router.navigate(['/app/adoption/my-requests']);
  }
}
