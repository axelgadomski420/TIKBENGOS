
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  EventCoachAnalysisRequest,
  EventCoachAnalysisResponse,
  EventCoachRecommendation,
  EventCoachService
} from './event-coach.service';

export type CoachState = 'idle' | 'loading' | 'ready' | 'error';

export interface CoachSnapshot {
  state:           CoachState;
  result:          EventCoachAnalysisResponse | null;
  errorMessage:    string;
  lastAnalyzedAt:  Date | null;
  appliedChanges:  string[];
}

@Injectable()
export class EventCoachStateService implements OnDestroy {

  private readonly snapshotSubject = new BehaviorSubject<CoachSnapshot>({
    state:          'idle',
    result:         null,
    errorMessage:   '',
    lastAnalyzedAt: null,
    appliedChanges: []
  });

  readonly snapshot$ = this.snapshotSubject.asObservable();

  private lastSnapshotKey  = '';
  private previousAnalysis = '';
  private activeRequestId  = 0;

  // BUG 2 FIX : debounce pour éviter les appels en rafale
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 600;

  constructor(private coachService: EventCoachService) {}

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.activeRequestId++; // Annule toute requête en cours
  }

  // ─── Analyse (avec debounce) ─────────────────────────────────────

  analyze(formValue: Record<string, any>, isLocationRequired: boolean, force = false): void {
    const key = JSON.stringify(this.buildSnapshotKey(formValue, isLocationRequired));

    // Éviter les analyses identiques (sauf si force=true)
    if (!force && key === this.lastSnapshotKey) return;
    this.lastSnapshotKey = key;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (force) {
      // Apply → analyse immédiate sans debounce
      this.runAnalysis(formValue, isLocationRequired);
    } else {
      this.debounceTimer = setTimeout(() => {
        this.runAnalysis(formValue, isLocationRequired);
      }, this.DEBOUNCE_MS);
    }
  }

  // ─── Application d'une recommandation ────────────────────────────

  /**
   * BUG 1 FIX :
   * On construit le form FUSIONNÉ avant d'appeler analyze(),
   * sans attendre que ngDoCheck propage le changement.
   * On passe ce form fusionné directement à runAnalysis().
   */
  applyRecommendation(
    formValue:    Record<string, any>,
    patchValue:   (values: Record<string, any>) => void,
    recommendation: EventCoachRecommendation,
    isLocationRequired: boolean
  ): void {
    const patch = this.mapRecommendationToPatch(formValue, recommendation);
    if (!patch) return;

    // 1. Appliquer visuellement dans le form parent
    patchValue(patch);

    // 2. Construire le form fusionné IMMÉDIATEMENT
    const mergedForm = { ...formValue, ...patch };

    // 3. Enregistrer le changement dans l'historique
    const summary    = this.buildChangeSummary(recommendation);
    const current    = this.snapshotSubject.value.appliedChanges;
    const nextChanges = current.includes(summary)
      ? current
      : [...current, summary];

    this.patch({ appliedChanges: nextChanges });

    // 4. Analyser avec le form fusionné (force=true → pas de debounce)
    this.runAnalysis(mergedForm, isLocationRequired, nextChanges, true);
  }

  reset(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.activeRequestId++;
    this.lastSnapshotKey  = '';
    this.previousAnalysis = '';
    this.snapshotSubject.next({
      state: 'idle', result: null, errorMessage: '',
      lastAnalyzedAt: null, appliedChanges: []
    });
  }

  // ─── Requête HTTP ─────────────────────────────────────────────────

  private runAnalysis(
    formValue:         Record<string, any>,
    isLocationRequired: boolean,
    appliedChanges?:   string[],
    force              = false
  ): void {
    const changes = appliedChanges ?? this.snapshotSubject.value.appliedChanges;
    const payload  = this.buildPayload(formValue, isLocationRequired, changes);
    const reqId    = ++this.activeRequestId;

    this.patch({ state: 'loading', errorMessage: '' });

    this.coachService.analyzeEvent(payload).subscribe({
      next: (result) => {
        if (reqId !== this.activeRequestId) return; // Réponse périmée
        this.previousAnalysis = result.analysis ?? '';
        this.patch({
          state:          'ready',
          result,
          errorMessage:   '',
          lastAnalyzedAt: new Date()
        });
      },
      error: () => {
        if (reqId !== this.activeRequestId) return;
        this.patch({
          state:        'error',
          result:       null,
          errorMessage: 'The event coach is unavailable right now. Please try again.'
        });
      }
    });
  }

  // ─── Builders ────────────────────────────────────────────────────

  private buildPayload(
    formValue:         Record<string, any>,
    isLocationRequired: boolean,
    appliedChanges:    string[]
  ): EventCoachAnalysisRequest {
    return {
      title:            this.readString(formValue['title']),
      description:      this.readString(formValue['description']),
      date:             this.readString(formValue['startDate']) || null,
      location:         isLocationRequired
                          ? this.readString(formValue['location'])
                          : 'Online Event',
      animalTypes:      this.parseAnimalTypes(formValue['expectedAnimalTypesText']),
      maxCapacity:      Number(formValue['maxParticipants']) > 0
                          ? Number(formValue['maxParticipants'])
                          : 1,
      previousAnalysis: this.previousAnalysis,
      appliedChanges
    };
  }

  private buildSnapshotKey(formValue: Record<string, any>, isLoc: boolean): Record<string, any> {
    return {
      title:       this.readString(formValue['title']),
      description: this.readString(formValue['description']),
      startDate:   this.readString(formValue['startDate']),
      location:    isLoc ? this.readString(formValue['location']) : 'Online',
      animals:     this.readString(formValue['expectedAnimalTypesText']),
      capacity:    Number(formValue['maxParticipants']) || 1,
      changes:     this.snapshotSubject.value.appliedChanges
    };
  }

  private buildChangeSummary(rec: EventCoachRecommendation): string {
    const val = this.formatSuggestedValue(rec.suggested_value);
    return `${rec.field}:${val}`;
  }

  // ─── Mapping recommandation → patch form ─────────────────────────

  private mapRecommendationToPatch(
    formValue:      Record<string, any>,
    recommendation: EventCoachRecommendation
  ): Record<string, any> | null {
    const v = recommendation.suggested_value;

    switch (recommendation.field) {
      case 'title':
        return typeof v === 'string' && v.trim() ? { title: v.trim() } : null;

      case 'description':
        return typeof v === 'string' && v.trim() ? { description: v.trim() } : null;

      case 'location':
        return typeof v === 'string' && v.trim() ? { location: v.trim() } : null;

      case 'animal_types':
        if (Array.isArray(v))         return { expectedAnimalTypesText: v.join(', ') };
        if (typeof v === 'string')    return { expectedAnimalTypesText: v.trim() };
        return null;

      case 'max_capacity':
        const num = Number(v);
        return !isNaN(num) && num > 0 ? { maxParticipants: num } : null;

      case 'date':
        return typeof v === 'string' ? this.buildDatePatch(formValue, v) : null;

      default:
        return null;
    }
  }

  private buildDatePatch(
    formValue: Record<string, any>,
    dateStr:   string
  ): Record<string, any> | null {
    const suggested = new Date(dateStr);
    if (isNaN(suggested.getTime())) return null;

    const currentStart = formValue['startDate'] ? new Date(formValue['startDate']) : null;
    const currentEnd   = formValue['endDate']   ? new Date(formValue['endDate'])   : null;
    const duration     = (currentStart && currentEnd && currentEnd > currentStart)
                           ? currentEnd.getTime() - currentStart.getTime()
                           : 2 * 60 * 60 * 1000; // 2h par défaut

    const nextStart = currentStart
      ? new Date(
          suggested.getFullYear(), suggested.getMonth(), suggested.getDate(),
          currentStart.getHours(), currentStart.getMinutes()
        )
      : suggested;

    const nextEnd = new Date(nextStart.getTime() + duration);

    return {
      startDate: this.toDateTimeLocal(nextStart),
      endDate:   this.toDateTimeLocal(nextEnd)
    };
  }

  // ─── Utilitaires ────────────────────────────────────────────────

  private patch(partial: Partial<CoachSnapshot>): void {
    this.snapshotSubject.next({ ...this.snapshotSubject.value, ...partial });
  }

  private parseAnimalTypes(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private formatSuggestedValue(value: string | number | string[] | null): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined || value === '') return 'applied';
    return String(value).trim().substring(0, 80); // tronquer pour les clés longues
  }

  private toDateTimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
         + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}