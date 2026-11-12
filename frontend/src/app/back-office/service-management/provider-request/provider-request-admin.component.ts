
import { Component, OnInit } from '@angular/core';
import { ProviderRequestService, ProviderRequest } from './provider-request.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-provider-request-admin',
  templateUrl: './provider-request-admin.component.html',
  styleUrls: ['./provider-request-admin.component.css']
})
export class ProviderRequestAdminComponent implements OnInit {

  requests: ProviderRequest[] = [];
  loading = false;

  stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  currentFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';
  searchQuery: string = '';
  selectedRequest: ProviderRequest | null = null;

  constructor(
    private providerRequestService: ProviderRequestService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.providerRequestService.getAllRequests().subscribe({
      next: (data) => {
        this.requests = data.sort((a, b) => {
          // Sort PENDING first, then by date descending (assuming id correlates with date)
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return (b.id || 0) - (a.id || 0);
        });

        this.calculateStats();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load requests', err);
        this.notificationService.error('Erreur', 'Impossible de charger les demandes.');
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      total: this.requests.length,
      pending: this.requests.filter(r => r.status === 'PENDING').length,
      approved: this.requests.filter(r => r.status === 'APPROVED').length,
      rejected: this.requests.filter(r => r.status === 'REJECTED').length
    };
  }

  getFilteredRequests(): ProviderRequest[] {
    let results = this.requests;

    if (this.currentFilter !== 'ALL') {
      results = results.filter(r => r.status === this.currentFilter);
    }

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      results = results.filter(r =>
        (r.fullName && r.fullName.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q))
      );
    }

    return results;
  }

  setFilter(filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.currentFilter = filter;
    this.selectedRequest = null;
  }

  selectRequest(req: ProviderRequest): void {
    this.selectedRequest = req;
  }

  approveRequest(id: number): void {
    if (confirm("Confirmez-vous l'approbation de ce prestataire ? Il pourra dès lors publier des services.")) {
      this.providerRequestService.approve(id).subscribe({
        next: () => {
          this.notificationService.success("Succès", "Prestataire approuvé avec succès !");
          if (this.selectedRequest?.id === id) {
            this.selectedRequest.status = 'APPROVED';
          }
          this.loadRequests();
        },
        error: (err: any) => {
          console.error(err);
          this.notificationService.error("Erreur", "Erreur lors de l'approbation.");
        }
      });
    }
  }

  rejectRequest(id: number): void {
    if (confirm("Êtes-vous sûr de vouloir refuser cette demande ? Le prestataire devra en soumettre une nouvelle.")) {
      this.providerRequestService.reject(id).subscribe({
        next: () => {
          this.notificationService.success("Succès", "Demande refusée.");
          if (this.selectedRequest?.id === id) {
            this.selectedRequest.status = 'REJECTED';
          }
          this.loadRequests();
        },
        error: (err: any) => {
          console.error(err);
          this.notificationService.error("Erreur", "Erreur lors du refus.");
        }
      });
    }
  }

  downloadCv(cvUrl: string | undefined): void {
    if (cvUrl) {
      const fullUrl = this.providerRequestService.getCvUrl(cvUrl);
      window.open(fullUrl, '_blank');
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getCoherenceColor(score: number): string {
    if (score >= 0.75) return 'text-green-400';
    if (score >= 0.5) return 'text-amber-400';
    return 'text-red-400';
  }

  getCoherenceLabel(score: number): string {
    if (score >= 0.75) return '✅ Strong coherence — skills align well with experience.';
    if (score >= 0.5) return '⚠️ Moderate coherence — some inconsistencies detected.';
    return '❌ Low coherence — significant inconsistencies in the profile.';
  }
}
