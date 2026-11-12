import { Component, OnInit } from '@angular/core';
import { ProviderDashboardService, ProviderDashboard, PriorityItem } from '../../services/provider-dashboard.service';

@Component({
  selector: 'app-provider-dashboard',
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.css']
})
export class ProviderDashboardComponent implements OnInit {

  // Récupère l'ID du provider depuis le localStorage (authentification existante)
  providerId: number = parseInt(localStorage.getItem('userId') || '1', 10);

  dashboard: ProviderDashboard | null = null;
  loading = false;
  error: string | null = null;
  generatedAt: Date | null = null;

  constructor(private dashboardService: ProviderDashboardService) {}

  ngOnInit(): void {
    this.generate();
  }

  generate(): void {
    this.loading = true;
    this.error = null;
    this.dashboard = null;

    this.dashboardService.generate(this.providerId).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.generatedAt = new Date();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de générer l\'analyse. Vérifiez votre connexion.';
        this.loading = false;
        console.error('[Dashboard IA]', err);
      }
    });
  }

  getLevelClass(level: string): string {
    switch (level?.toUpperCase()) {
      case 'URGENT': return 'level-urgent';
      case 'NORMAL': return 'level-normal';
      case 'FAIBLE': return 'level-low';
      default: return 'level-normal';
    }
  }

  getLevelIcon(level: string): string {
    switch (level?.toUpperCase()) {
      case 'URGENT': return '🔴';
      case 'NORMAL': return '🟡';
      case 'FAIBLE': return '🟢';
      default: return '🟡';
    }
  }

  getInsightIcon(index: number): string {
    const icons = ['📈', '📅', '👥', '💰', '⭐', '🏆'];
    return icons[index % icons.length];
  }

  getRecoIcon(index: number): string {
    const icons = ['💡', '📊', '🎯', '⚡', '🚀'];
    return icons[index % icons.length];
  }
}
