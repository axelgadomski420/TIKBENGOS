// ══════════════════════════════════════════════════════════════════════
// ai-description-generator.component.ts  (v2)
// Chemin : src/app/back-office/events/components/ai-description-generator/
// ══════════════════════════════════════════════════════════════════════

import {
  Component, Input, Output, EventEmitter, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  AiDescriptionService,
  GenerationContext,
  GenerationTone,
  GenerationLang,
  RuleSummary,
  StreamChunk
} from '../../services/ai-description.service';
import { EventCategory, EventEligibilityRule } from '../../models/admin-events.models';

// ── Types ──────────────────────────────────────────────────────────
type PanelState = 'idle' | 'generating' | 'done' | 'error';

interface HistoryEntry {
  text:      string;
  tone:      GenerationTone;
  language:  GenerationLang;
  words:     number;
  timestamp: Date;
}

// ── Component ──────────────────────────────────────────────────────
@Component({
  selector: 'app-ai-description-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-description-generator.component.html',
  styleUrls:  ['./ai-description-generator.component.css']
})
export class AiDescriptionGeneratorComponent implements OnDestroy {

  // ── Inputs / Outputs ──────────────────────────────────────────
  @Input() form!:              any;
  @Input() categories:         EventCategory[]              = [];
  @Input() rules:              Partial<EventEligibilityRule>[] = [];
  @Output() descriptionGenerated = new EventEmitter<string>();

  @ViewChild('streamEl') streamEl!: ElementRef<HTMLElement>;

  // ── Options ───────────────────────────────────────────────────
  selectedTone: GenerationTone = 'professional';
  selectedLang: GenerationLang = 'fr';

  readonly tones: { id: GenerationTone; label: string; emoji: string; tagline: string }[] = [
    { id: 'professional', label: 'Professional', emoji: '🎯', tagline: 'Authoritative & precise'   },
    { id: 'friendly',     label: 'Friendly',     emoji: '🤝', tagline: 'Warm & accessible'         },
    { id: 'exciting',     label: 'Exciting',     emoji: '⚡', tagline: 'High-energy & motivating'  }
  ];

  readonly langs: { id: GenerationLang; flag: string; name: string }[] = [
    { id: 'fr', flag: '🇫🇷', name: 'Français' },
    { id: 'en', flag: '🇬🇧', name: 'English'  }
  ];

  // ── State machine ─────────────────────────────────────────────
  panelState:   PanelState = 'idle';
  streamedText  = '';
  errorMessage  = '';
  copied        = false;

  // Métriques live
  tokenCount    = 0;
  elapsedSec    = 0;
  private timer: any = null;

  // Historique des générations (session)
  history: HistoryEntry[] = [];
  showHistory = false;

  // Animation du bouton
  buttonPulsing = false;

  // ✅ AJOUT : Flag pour empêcher les clics multiples
  private isGenerating = false;

  private sub: Subscription | null = null;

  constructor(
    private aiService: AiDescriptionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.stopTimer();
  }

  // ─── Validation et qualité du contexte ───────────────────────

  get canGenerate(): boolean {
    return !!(this.form?.title?.trim() && this.form?.categoryId)
      && this.panelState !== 'generating'
      && !this.isGenerating;
  }

  get missingFields(): string[] {
    const m: string[] = [];
    if (!this.form?.title?.trim()) m.push('title');
    if (!this.form?.categoryId)    m.push('category');
    return m;
  }

  get contextScore(): number {
    let s = 0;
    if (this.form?.title?.trim())       s += 20;
    if (this.form?.categoryId)          s += 20;
    if (this.form?.location?.trim())    s += 15;
    if (this.form?.startDate)           s += 15;
    if (this.form?.endDate)             s += 10;
    if (this.form?.maxParticipants > 0) s += 10;
    if (this.rules?.filter(r => r.active !== false).length > 0) s += 10;
    return Math.min(s, 100);
  }

  get contextLevel(): 'minimal' | 'good' | 'optimal' {
    if (this.contextScore >= 80) return 'optimal';
    if (this.contextScore >= 40) return 'good';
    return 'minimal';
  }

  get contextLevelText(): string {
    return {
      minimal: 'Minimal data',
      good:    'Good data',
      optimal: 'Optimal — best results'
    }[this.contextLevel];
  }

  // ─── Actions ──────────────────────────────────────────────────

  generate(): void {
    // ✅ Empêcher les clics multiples
    if (this.isGenerating) return;
    this.isGenerating = true;

    this.panelState   = 'generating';
    this.streamedText = '';
    this.errorMessage = '';
    this.tokenCount   = 0;
    this.elapsedSec   = 0;
    this.startTimer();

    const category = this.categories.find(c => c.id === this.form.categoryId);
    const ctx: GenerationContext = {
      title:            this.form.title,
      categoryName:     category?.name    ?? 'Event',
      categoryIcon:     category?.icon    ?? '🐾',
      isCompetition:    !!(category?.requiresApproval || (category as any)?.competitionMode),
      requiresApproval: !!(category?.requiresApproval),
      location:         this.form.location    ?? '',
      startDate:        this.form.startDate   ?? '',
      endDate:          this.form.endDate     ?? '',
      maxParticipants:  this.form.maxParticipants ?? 0,
      isOnline:         this.form.isOnline    ?? false,
      rules:            this.buildRuleSummaries(),
      tone:             this.selectedTone,
      language:         this.selectedLang
    };

    this.sub?.unsubscribe();
    this.sub = this.aiService.generateDescription(ctx).subscribe({
      next: (chunk: StreamChunk) => {
        if (chunk.type === 'token') {
          this.streamedText += chunk.content;
          this.tokenCount++;
          setTimeout(() => {
            if (this.streamEl?.nativeElement) {
              this.streamEl.nativeElement.scrollTop =
                this.streamEl.nativeElement.scrollHeight;
            }
          }, 0);
        } else if (chunk.type === 'done') {
          this.panelState = 'done';
          this.stopTimer();
          this.pushToHistory();
          // ✅ Réactiver après 5 secondes
          setTimeout(() => {
            this.isGenerating = false;
            this.cdr.markForCheck();
          }, 5000);
        } else if (chunk.type === 'error') {
          this.panelState   = 'error';
          this.errorMessage = chunk.content;
          this.stopTimer();
          this.isGenerating = false;
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.panelState   = 'error';
        this.errorMessage = err?.message || 'Network error. Please verify your API key configuration.';
        this.stopTimer();
        this.isGenerating = false;
        this.cdr.markForCheck();
      }
    });
  }

  apply(): void {
    if (!this.streamedText.trim()) return;
    this.descriptionGenerated.emit(this.streamedText.trim());
    this.buttonPulsing = true;
    setTimeout(() => { this.buttonPulsing = false; this.cdr.markForCheck(); }, 600);
  }

  async copyToClipboard(): Promise<void> {
    if (!this.streamedText) return;
    try {
      await navigator.clipboard.writeText(this.streamedText);
      this.copied = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2000);
    } catch {
      // Clipboard non disponible
    }
  }

  regenerate(): void {
    this.generate();
  }

  cancel(): void {
    this.sub?.unsubscribe();
    this.panelState = 'idle';
    this.stopTimer();
    this.isGenerating = false;
    this.cdr.markForCheck();
  }

  reset(): void {
    this.panelState   = 'idle';
    this.streamedText = '';
    this.errorMessage = '';
    this.isGenerating = false;
    this.cdr.markForCheck();
  }

  loadFromHistory(entry: HistoryEntry): void {
    this.streamedText    = entry.text;
    this.selectedTone    = entry.tone;
    this.selectedLang    = entry.language;
    this.panelState      = 'done';
    this.showHistory     = false;
    this.cdr.markForCheck();
  }

  // ─── Helpers privés ──────────────────────────────────────────

  private buildRuleSummaries(): RuleSummary[] {
    const labelMap: Record<string, string> = {
      ALLOWED_BREEDS:         'Allowed breeds',
      FORBIDDEN_BREEDS:       'Forbidden breeds',
      ALLOWED_SPECIES:        'Allowed species',
      MIN_AGE_MONTHS:         'Minimum age',
      MAX_AGE_MONTHS:         'Maximum age',
      MIN_WEIGHT_KG:          'Min weight',
      MAX_WEIGHT_KG:          'Max weight',
      VACCINATION_REQUIRED:   'Vaccination',
      LICENSE_REQUIRED:       'License/Pedigree',
      MEDICAL_CERT_REQUIRED:  'Medical certificate',
      ALLOWED_SEXES:          'Allowed sexes',
      MIN_EXPERIENCE_LEVEL:   'Min experience level',
      STERILIZATION_REQUIRED: 'Sterilization'
    };
    return (this.rules ?? [])
      .filter(r => r.active !== false && r.criteria)
      .map(r => {
        let value = '';
        if (r.valueType === 'LIST' && r.listValues) {
          value = r.listValues;
        }
        if (r.valueType === 'NUMBER' && r.numericValue != null) {
          value = String(r.numericValue);
        }
        if (r.valueType === 'BOOLEAN' && r.booleanValue != null) {
          value = r.booleanValue ? 'Required' : 'Not required';
        }
        return {
          criteria: r.criteria!,
          label:    labelMap[r.criteria!] ?? r.criteria!,
          value,
          isHard:   r.hardReject ?? true
        };
      })
      .filter(r => r.value);
  }

  private pushToHistory(): void {
    if (!this.streamedText.trim()) return;
    this.history.unshift({
      text:      this.streamedText.trim(),
      tone:      this.selectedTone,
      language:  this.selectedLang,
      words:     this.wordCount,
      timestamp: new Date()
    });
    if (this.history.length > 5) this.history.pop();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.elapsedSec++;
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ─── Getters template ────────────────────────────────────────

  get wordCount(): number {
    return this.streamedText.trim()
      ? this.streamedText.trim().split(/\s+/).length
      : 0;
  }

  get charCount(): number {
    return this.streamedText.length;
  }

  get elapsedFormatted(): string {
    return this.elapsedSec < 60
      ? `${this.elapsedSec}s`
      : `${Math.floor(this.elapsedSec / 60)}m${this.elapsedSec % 60}s`;
  }

  get selectedToneEmoji(): string {
    return this.tones.find(t => t.id === this.selectedTone)?.emoji ?? '🎯';
  }

  trackTone(_: number, t: { id: string }): string {
    return t.id;
  }

  trackLang(_: number, l: { id: string }): string {
    return l.id;
  }

  trackHistory(_: number, h: HistoryEntry): number {
    return h.timestamp.getTime();
  }
}