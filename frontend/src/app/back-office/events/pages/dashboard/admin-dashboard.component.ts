import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';  // ← Ajouter Router
import { AdminEventService, AdminAuthService, AdminExportService } from '../../services/admin-api.service';
import { EventStatsResponse } from '../../models/admin-events.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  stats: EventStatsResponse | null = null;
  loading = true;
  startDateFilter = '';
  endDateFilter = '';

  statusLabels: Record<string, string> = {
    PLANNED: 'Planned',
    ONGOING: 'Ongoing',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    FULL: 'Full'
  };

  constructor(
    private eventService: AdminEventService,
    private auth: AdminAuthService,
    private exportService: AdminExportService,
    private router: Router  // ← Ajouter Router
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  // ✅ Méthode pour revenir en arrière
  goBack(): void {
    this.router.navigate(['/admin/events']);
  }

  get filteredTopEvents() {
    const events = this.stats?.topEvents ?? [];

    if (!this.startDateFilter && !this.endDateFilter) {
      return events;
    }

    const start = this.startDateFilter ? new Date(this.startDateFilter).setHours(0, 0, 0, 0) : null;
    const end = this.endDateFilter ? new Date(this.endDateFilter).setHours(23, 59, 59, 999) : null;

    return events.filter((event) => {
      if (!event.createdAt) return false;
      const createdAt = new Date(event.createdAt).getTime();
      if (start !== null && createdAt < start) return false;
      if (end !== null && createdAt > end) return false;
      return true;
    });
  }

  clearDateFilters(): void {
    this.startDateFilter = '';
    this.endDateFilter = '';
  }

  loadStats() {
    this.loading = true;
    this.eventService.getStats(this.auth.getAdminId()).subscribe({
      next: (s) => {
        this.stats = s;
        this.loading = false;
        console.log('Dashboard stats loaded:', s);
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.loading = false;
      }
    });
  }

  exportAll(): void {
    this.exportService.exportAllEvents(this.auth.getAdminId()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `events_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Export failed:', err);
      }
    });
  }

  get trendEntries() {
    if (!this.stats?.monthlyTrend) return [];
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return Object.entries(this.stats.monthlyTrend).map(([k, v]) => {
      const [, m] = k.split('-');
      return {
        key: k,
        count: v as number,
        label: k,
        shortLabel: months[+m - 1],
        isCurrent: k === currentKey
      };
    });
  }

  get maxTrend(): number {
    const max = Math.max(...this.trendEntries.map(e => e.count), 1);
    return max;
  }

  trendBarHeight(count: number): number {
    return Math.max(4, Math.round((count / this.maxTrend) * 100));
  }

  get statusEntries() {
    if (!this.stats) return [];
    return Object.entries(this.stats.eventsByStatus).map(([key, value]) => ({ 
      key, 
      value: value as number 
    }));
  }

  get categoryEntries() {
    if (!this.stats) return [];
    return Object.entries(this.stats.eventsByCategory).map(([key, value]) => ({ 
      key, 
      value: value as number 
    })).slice(0, 6);
  }

  get maxStatus() { 
    const max = Math.max(...this.statusEntries.map(e => e.value), 1);
    return max;
  }
  
  get maxCategory() { 
    const max = Math.max(...this.categoryEntries.map(e => e.value), 1);
    return max;
  }

  barPct(val: number, max: number) { 
    return Math.round((val / max) * 100); 
  }

  hasDateFilters(): boolean {
    return !!(this.startDateFilter || this.endDateFilter);
  }
  
  fillPct(e: any) {
    if (!e.maxParticipants) return 0;
    return Math.round(((e.maxParticipants - e.remainingSlots) / e.maxParticipants) * 100);
  }
}
