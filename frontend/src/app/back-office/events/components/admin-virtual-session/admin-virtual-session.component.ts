import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminToastService } from '../../services/admin-toast.service';

import {
  AttendanceResponse,
  CreateVirtualSessionRequest,
  SessionStatsResponse,
  VirtualSessionResponse,
  VirtualSessionService
} from '../../services/virtual-session.service';

type AdminTab = 'setup' | 'stats';

@Component({
  selector: 'app-admin-virtual-session',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-virtual-session.component.html',
  styleUrls: ['./admin-virtual-session.component.css']
})
export class AdminVirtualSessionComponent implements OnInit, OnChanges {
  @Input({ required: true }) eventId!: number;
  @Input({ required: true }) adminId!: number;

  activeTab: AdminTab = 'setup';
  session: VirtualSessionResponse | null = null;
  stats: SessionStatsResponse | null = null;

  loading = true;
  statsLoading = false;
  creating = false;
  statsError = '';
  copiedModeratorPassword = false;

  createForm: CreateVirtualSessionRequest = {
    earlyAccessMinutes: 15,
    attendanceThresholdPercent: 80,
    externalRoomUrl: null
  };

  statsSortField: keyof AttendanceResponse = 'attendancePercent';
  statsSortDir: 'asc' | 'desc' = 'desc';

  sendingCert: Record<number, boolean> = {};
  sentCert: Record<number, boolean> = {};
  notifyingAll = false;

  constructor(
    private virtualService: VirtualSessionService,
    private cdr: ChangeDetectorRef,
    private toast: AdminToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange) {
      this.reset();
      this.load();
    }
  }

  get sortedParticipants(): AttendanceResponse[] {
    if (!this.stats?.participantDetails) {
      return [];
    }

    return [...this.stats.participantDetails].sort((left, right) => {
      const leftValue = this.getSortableValue(left, this.statsSortField);
      const rightValue = this.getSortableValue(right, this.statsSortField);

      if (leftValue < rightValue) {
        return this.statsSortDir === 'asc' ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return this.statsSortDir === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }

  get sessionStatusLabel(): string {
    const labels: Record<string, string> = {
      SCHEDULED: 'Scheduled',
      OPEN: 'Live',
      CLOSED: 'Closed',
      ARCHIVED: 'Archived'
    };

    return labels[this.session?.status ?? ''] ?? 'Inactive';
  }

  get sessionStatusTone(): string {
    const tones: Record<string, string> = {
      SCHEDULED: 'is-scheduled',
      OPEN: 'is-live',
      CLOSED: 'is-closed',
      ARCHIVED: 'is-archived'
    };

    return tones[this.session?.status ?? ''] ?? 'is-neutral';
  }

  get joinedRate(): number {
    if (!this.stats || this.stats.totalRegistered <= 0) {
      return 0;
    }

    return Math.round((this.stats.totalJoined / this.stats.totalRegistered) * 100);
  }

  get certificatesEligibleCount(): number {
    return this.stats?.participantDetails.filter(participant => participant.certificateEarned).length ?? 0;
  }

  private load(): void {
    this.loading = true;

    this.virtualService.getSessionForAdmin(this.eventId, this.adminId)
      .pipe(catchError(() => of(null)))
      .subscribe(session => {
        this.session = session;
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private reset(): void {
    this.activeTab = 'setup';
    this.session = null;
    this.stats = null;
    this.loading = true;
    this.statsLoading = false;
    this.creating = false;
    this.statsError = '';
    this.copiedModeratorPassword = false;
    this.sendingCert = {};
    this.sentCert = {};
    this.notifyingAll = false;
  }

  createSession(): void {
    this.creating = true;

    const payload: CreateVirtualSessionRequest = {
      earlyAccessMinutes: this.createForm.earlyAccessMinutes,
      attendanceThresholdPercent: this.createForm.attendanceThresholdPercent,
      externalRoomUrl: this.createForm.externalRoomUrl?.trim() || null
    };

    this.virtualService.createSession(this.eventId, this.adminId, payload).subscribe({
      next: session => {
        this.session = session;
        this.creating = false;
        this.toast.success('Virtual session created', 'The live room and certificate rules are now configured.');
        this.cdr.markForCheck();
      },
      error: err => {
        this.creating = false;
        this.toast.error('Creation failed', err?.error?.message ?? 'Unable to create the virtual session.');
        this.cdr.markForCheck();
      }
    });
  }

  switchTab(tab: AdminTab): void {
    this.activeTab = tab;

    if (tab === 'stats' && !this.stats && !this.statsLoading) {
      this.loadStats();
    }
  }

  loadStats(): void {
    this.statsLoading = true;
    this.statsError = '';

    this.virtualService.getStats(this.eventId, this.adminId).subscribe({
      next: stats => {
        this.stats = stats;
        this.statsLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.statsLoading = false;
        this.statsError = err?.error?.message ?? 'Attendance analytics are not available yet.';
        this.cdr.markForCheck();
      }
    });
  }

  sortBy(field: keyof AttendanceResponse): void {
    if (this.statsSortField === field) {
      this.statsSortDir = this.statsSortDir === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.statsSortField = field;
    this.statsSortDir = field === 'userName' ? 'asc' : 'desc';
  }

  openCertificate(userId: number): void {
    this.virtualService.openCertificate(this.eventId, userId);
  }

  getCertificateUrl(userId: number): string {
    return this.virtualService.getCertificateUrl(this.eventId, userId);
  }

  sendCertificateEmail(userId: number): void {
    if (this.sendingCert[userId]) {
      return;
    }

    this.sendingCert[userId] = true;

    this.virtualService.sendCertificateEmail(this.eventId, userId).subscribe({
      next: () => {
        this.sendingCert[userId] = false;
        this.sentCert[userId] = true;
        this.toast.success('Certificate sent', 'The certificate email has been sent successfully.');
        this.cdr.markForCheck();

        setTimeout(() => {
          this.sentCert[userId] = false;
          this.cdr.markForCheck();
        }, 3000);
      },
      error: err => {
        this.sendingCert[userId] = false;
        this.toast.error('Email failed', err?.error ?? 'Unable to send the certificate email.');
        this.cdr.markForCheck();
      }
    });
  }

  notifyAllCertificates(): void {
    const eligible = this.sortedParticipants.filter(participant => participant.certificateEarned);

    if (!eligible.length) {
      this.toast.warning('No certificates ready', 'No participants are currently eligible for certificate delivery.');
      return;
    }

    if (this.notifyingAll) {
      return;
    }

    this.notifyingAll = true;

    const requests = eligible.map(participant =>
      this.virtualService.sendCertificateEmail(this.eventId, participant.userId).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe(results => {
      const succeeded = results.filter(result => result !== null).length;

      eligible.forEach((participant, index) => {
        if (results[index] !== null) {
          this.sentCert[participant.userId] = true;
        }
      });

      this.notifyingAll = false;
      if (succeeded === eligible.length) {
        this.toast.success('Certificates delivered', `Certificates emailed to ${succeeded} participant${succeeded > 1 ? 's' : ''}.`);
      } else {
        this.toast.warning('Partial delivery', `Sent ${succeeded} of ${eligible.length} certificate email${eligible.length > 1 ? 's' : ''}.`);
      }

      this.cdr.markForCheck();
    });
  }

  async copyModeratorPassword(): Promise<void> {
    if (!this.session?.moderatorPassword || !navigator?.clipboard) {
      this.toast.warning('Clipboard unavailable', 'Copying is not available in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.session.moderatorPassword);
      this.copiedModeratorPassword = true;
      this.toast.success('Password copied', 'The moderator password has been copied to the clipboard.');
      this.cdr.markForCheck();

      setTimeout(() => {
        this.copiedModeratorPassword = false;
        this.cdr.markForCheck();
      }, 2500);
    } catch {
      this.copiedModeratorPassword = false;
      this.toast.error('Copy failed', 'The moderator password could not be copied.');
      this.cdr.markForCheck();
    }
  }

  attendanceTone(percent: number | null): string {
    if (percent === null) {
      return 'is-pending';
    }

    if (percent >= 80) {
      return 'is-strong';
    }

    if (percent >= 50) {
      return 'is-mid';
    }

    return 'is-low';
  }

  attendanceTrackWidth(percent: number | null): number {
    if (percent === null) {
      return 0;
    }

    return Math.max(0, Math.min(100, percent));
  }

  private getSortableValue(
    participant: AttendanceResponse,
    field: keyof AttendanceResponse
  ): string | number | boolean {
    const value = participant[field];

    if (value === null) {
      return '';
    }

    return value;
  }

  trackById(_: number, item: AttendanceResponse): number {
    return item.userId;
  }
}