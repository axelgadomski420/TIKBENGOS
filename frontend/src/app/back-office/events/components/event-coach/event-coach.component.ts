
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  Input,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EventCoachRecommendation } from '../../services/event-coach.service';
import { CoachSnapshot, EventCoachStateService } from '../../services/event-coach-state.service';

interface PatchableEventForm {
  value: Record<string, any>;
  patchValue(values: Record<string, any>): void;
}

@Component({
  selector: 'app-event-coach',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-coach.component.html',
  styleUrls: ['./event-coach.component.css'],
  providers: [EventCoachStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCoachComponent implements DoCheck, OnDestroy {

  @Input() form: PatchableEventForm | null = null;
  @Input() isLocationRequired = true;

  state:          CoachSnapshot['state'] = 'idle';
  result:         CoachSnapshot['result'] = null;
  errorMessage    = '';
  lastAnalyzedAt: Date | null = null;
  appliedChanges: string[] = [];

  private lastSnapshot    = '';
  private isApplying      = false;   // BUG 1 FIX : lock pendant apply
  private applyLockTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly sub:   Subscription;

  constructor(
    private store: EventCoachStateService,
    private cdr:   ChangeDetectorRef
  ) {
    this.sub = this.store.snapshot$.subscribe(snap => {
      this.state          = snap.state;
      this.result         = snap.result;
      this.errorMessage   = snap.errorMessage;
      this.lastAnalyzedAt = snap.lastAnalyzedAt;
      this.appliedChanges = snap.appliedChanges;
      this.cdr.markForCheck();
    });
  }

  ngDoCheck(): void {
    // BUG 1 FIX : ne pas déclencher d'analyse pendant / juste après un apply
    if (this.isApplying) return;

    const formValue  = this.form?.value ?? {};
    const snapshot   = JSON.stringify(this.buildSnapshot(formValue));

    if (snapshot === this.lastSnapshot) return;
    this.lastSnapshot = snapshot;

    if (!this.canDisplayCoach) {
      this.store.reset();
      return;
    }

    this.store.analyze(formValue, this.isLocationRequired);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.applyLockTimer) clearTimeout(this.applyLockTimer);
  }

  // ─── Apply ───────────────────────────────────────────────────────

  applyRecommendation(recommendation: EventCoachRecommendation): void {
    if (!this.form) return;

    // BUG 1 FIX : verrouiller ngDoCheck pendant 800ms
    this.isApplying = true;
    if (this.applyLockTimer) clearTimeout(this.applyLockTimer);
    this.applyLockTimer = setTimeout(() => {
      this.isApplying = false;
      // Synchroniser le snapshot APRÈS que le form ait été mis à jour
      this.lastSnapshot = JSON.stringify(this.buildSnapshot(this.form?.value ?? {}));
    }, 800);

    this.store.applyRecommendation(
      this.form.value,
      (values) => this.form?.patchValue(values),
      recommendation,
      this.isLocationRequired
    );
  }

  refresh(): void {
    if (!this.form) return;
    this.store.analyze(this.form.value, this.isLocationRequired, true);
  }

  // ─── Getters template ────────────────────────────────────────────

  get canDisplayCoach(): boolean {
    const v = this.form?.value ?? {};
    return !!(
      this.readString(v['title']) &&
      this.readString(v['startDate']) &&
      (!this.isLocationRequired || this.readString(v['location']))
    );
  }

  get readiness(): number {
    const v = this.form?.value ?? {};
    let score = 0;
    if (this.readString(v['title']))                           score += 25;
    if (this.readString(v['description']).length >= 40)        score += 25;
    if (this.readString(v['startDate']))                       score += 20;
    if (!this.isLocationRequired || this.readString(v['location'])) score += 15;
    if (this.parseAnimalTypes(v['expectedAnimalTypesText']).length > 0) score += 15;
    return Math.min(score, 100);
  }

  get readinessLabel(): string {
    if (this.readiness >= 80) return 'Strong draft';
    if (this.readiness >= 50) return 'Good draft';
    return 'Needs more data';
  }

  // ─── Formatters ──────────────────────────────────────────────────

  formatSuggestedValue(value: string | number | string[] | null): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined || value === '') return 'No value provided';
    return String(value);
  }

  trackRecommendation(_: number, r: EventCoachRecommendation): string {
    return `${r.field}-${r.reason}`;
  }

  // ─── Utilitaires privés ───────────────────────────────────────────

  private buildSnapshot(v: Record<string, any>): Record<string, any> {
    return {
      title:       this.readString(v['title']),
      description: this.readString(v['description']),
      startDate:   this.readString(v['startDate']),
      location:    this.isLocationRequired ? this.readString(v['location']) : 'online',
      animals:     this.readString(v['expectedAnimalTypesText']),
      capacity:    Number(v['maxParticipants']) || 1
    };
  }

  private parseAnimalTypes(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}