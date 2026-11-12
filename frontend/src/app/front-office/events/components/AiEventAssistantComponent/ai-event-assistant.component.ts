// ai-event-assistant.component.ts
// Assistant IA unifié — 4 modes, design professionnel

import {
  Component, ElementRef, EventEmitter, Input,
  OnDestroy, OnInit, Output, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EventCategory, EventSummary } from '../../models/event.models';
import {
  AiEventAssistantService,
  AssistantMode,
  ConversationTurn,
  EnrichedMatch,
  InsightsResult,
  CompareResult,
  AdvisorResult,
  SmartMatchResult,
  StreamEvent
} from '../../services/ai-event-assistant.service';

// ── Types de panneaux ──────────────────────────────────────────
type PanelState = 'idle' | 'thinking' | 'streaming' | 'done' | 'empty' | 'error';

interface AdvisorMessage {
  role:      'user' | 'assistant';
  content:   string;
  time:      Date;
  followUps?: string[];
}

@Component({
  selector: 'app-ai-event-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-event-assistant.component.html',
  styleUrls: ['./ai-event-assistant.component.css'],
})
export class AiEventAssistantComponent implements OnInit, OnDestroy {

  @Input() events:         EventSummary[] = [];
  @Input() categories:     EventCategory[] = [];
  @Input() categoryFilter: number | null = null;

  @Output() eventSelected = new EventEmitter<number>();

  @ViewChild('inputEl')       inputEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatScrollEl')  chatScrollEl!: ElementRef<HTMLDivElement>;

  // ── Panel state ──────────────────────────────────────────────
  isOpen    = false;
  panelState: PanelState = 'idle';

  // ── Mode actif ───────────────────────────────────────────────
  activeMode: AssistantMode = 'smart-match';

  // ── Query / Pet context ──────────────────────────────────────
  userQuery   = '';
  petContext  = '';
  showPetCtx  = false;

  // ── Smart match ──────────────────────────────────────────────
  enrichedMatches: EnrichedMatch[] = [];
  summaryText      = '';
  generalAdvice    = '';
  selectedMatchId: number | null = null;
  hasSearched      = false;

  // ── Insights ─────────────────────────────────────────────────
  insightsEventId: number | null = null;
  insightsResult:  InsightsResult | null = null;

  // ── Compare ───────────────────────────────────────────────────
  compareIds:     number[] = [];
  compareResult:  CompareResult | null = null;
  compareStep:    'select' | 'result' = 'select';

  // ── Advisor (chat) ────────────────────────────────────────────
  advisorMessages:  AdvisorMessage[] = [];
  conversationHist: ConversationTurn[] = [];

  // ── Misc state ────────────────────────────────────────────────
  isBusy    = false;
  errorMsg  = '';
  streamBuffer = '';

  // ── Timer ──────────────────────────────────────────────────
  elapsedMs = 0;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;

  // ── Thinking animation ───────────────────────────────────────
  thinkingPhrase = '';
  private thinkingPhrases: Record<AssistantMode, string[]> = {
    'smart-match': [
      'Reading through events…',
      'Matching your profile…',
      'Checking eligibility…',
      'Ranking best options…',
      'Almost ready…',
    ],
    'insights': [
      'Loading event data…',
      'Analyzing requirements…',
      'Building your report…',
    ],
    'advisor': [
      'Thinking…',
      'Considering options…',
      'Crafting response…',
    ],
    'compare': [
      'Loading events…',
      'Running comparison…',
      'Building verdict…',
    ],
  };
  private thinkingIndex    = 0;
  private thinkingInterval: any = null;

  // ── Example prompts per mode ──────────────────────────────────
  readonly modeExamples: Record<AssistantMode, string[]> = {
    'smart-match': [
      'Active Border Collie, 2 years, want agility this month',
      'Senior cat, calm environment, no competitions',
      'Beginner dog owner, socialization focus, weekends only',
      'Young energetic dog, outdoor advanced events',
    ],
    'insights': [],
    'advisor': [
      'What events are good for a nervous rescue dog?',
      'How do I prepare my cat for their first show?',
      'What\'s the difference between agility levels?',
      'My dog is 8 months, what can they join?',
    ],
    'compare': [],
  };

  // ── Destroy ───────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private aiService: AiEventAssistantService,
    private router:    Router
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
    this.stopThinkingAnimation();
    document.body.style.overflow = '';
  }

  // ══════════════════════════════════════════════════════════════
  //  PANEL
  // ══════════════════════════════════════════════════════════════

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    document.body.style.overflow = this.isOpen ? 'hidden' : '';
    if (this.isOpen) {
      setTimeout(() => this.inputEl?.nativeElement?.focus(), 320);
    }
  }

  setMode(mode: AssistantMode): void {
    if (this.isBusy) return;
    this.activeMode = mode;
    this.resetResults();
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 100);
  }

  // ══════════════════════════════════════════════════════════════
  //  SEARCH DISPATCH
  // ══════════════════════════════════════════════════════════════

  search(): void {
    if (!this.canSearch) return;

    this.isBusy = true;
    this.panelState = 'thinking';
    this.errorMsg = '';
    this.streamBuffer = '';
    this.hasSearched = true;
    this.startTimer();
    this.startThinkingAnimation();

    let stream$;

    switch (this.activeMode) {
      case 'smart-match':
        stream$ = this.aiService.streamSmartMatch(
          this.userQuery, this.petContext || undefined,
          this.categoryFilter, 20
        );
        break;
      case 'insights':
        stream$ = this.aiService.streamInsights(
          this.insightsEventId!,
          this.petContext || undefined,
          this.userQuery || undefined
        );
        break;
      case 'advisor':
        const userMsg: AdvisorMessage = {
          role: 'user', content: this.userQuery, time: new Date()
        };
        this.advisorMessages.push(userMsg);
        this.conversationHist.push({ role: 'user', content: this.userQuery });
        this.userQuery = '';
        this.scrollChat();

        stream$ = this.aiService.streamAdvisor(
          userMsg.content, this.conversationHist.slice(-10), this.categoryFilter
        );
        break;
      case 'compare':
        stream$ = this.aiService.streamCompare(
          this.compareIds, this.petContext || undefined
        );
        break;
    }

    stream$!.pipe(takeUntil(this.destroy$)).subscribe({
      next: (event: StreamEvent) => this.handleStreamEvent(event),
      error: (err) => {
        this.finishBusy();
        this.panelState = 'error';
        this.errorMsg = 'Connection error. Please try again.';
      }
    });
  }

  private handleStreamEvent(event: StreamEvent): void {
    if (event.type === 'token') {
      if (this.panelState === 'thinking') {
        this.panelState = 'streaming';
        this.stopThinkingAnimation();
      }
      this.streamBuffer = event.content;

    } else if (event.type === 'done') {
      this.finishBusy();

      if (!event.result) { this.panelState = 'empty'; return; }

      switch (this.activeMode) {
        case 'smart-match':
          const smResult = event.result as SmartMatchResult;
          this.summaryText   = smResult.summary ?? '';
          this.generalAdvice = smResult.generalAdvice ?? '';
          this.enrichedMatches = this.aiService.enrichMatches(
            smResult.matches ?? [], this.events
          );
          this.panelState = this.enrichedMatches.length > 0 ? 'done' : 'empty';
          break;

        case 'insights':
          this.insightsResult = event.result as InsightsResult;
          this.panelState = 'done';
          break;

        case 'advisor':
          const advResult = event.result as AdvisorResult;
          const assistantMsg: AdvisorMessage = {
            role:      'assistant',
            content:   advResult.message || JSON.stringify(event.result),
            time:      new Date(),
            followUps: advResult.followUpQuestions
          };
          this.advisorMessages.push(assistantMsg);
          this.conversationHist.push({ role: 'assistant', content: assistantMsg.content });
          this.panelState = 'done';
          this.scrollChat();
          break;

        case 'compare':
          this.compareResult = event.result as CompareResult;
          this.panelState = 'done';
          break;
      }

    } else if (event.type === 'error') {
      this.finishBusy();
      this.panelState = 'error';
      this.errorMsg = event.content;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  COMPARE — event selection
  // ══════════════════════════════════════════════════════════════

  toggleCompareId(id: number): void {
    const idx = this.compareIds.indexOf(id);
    if (idx >= 0) {
      this.compareIds.splice(idx, 1);
    } else if (this.compareIds.length < 4) {
      this.compareIds.push(id);
    }
  }

  isInCompare(id: number): boolean {
    return this.compareIds.includes(id);
  }

  startCompare(): void {
    if (this.compareIds.length < 2) return;
    this.compareStep = 'result';
    this.search();
  }

  // ══════════════════════════════════════════════════════════════
  //  INSIGHTS — event selection
  // ══════════════════════════════════════════════════════════════

  selectInsightsEvent(id: number): void {
    this.insightsEventId = id;
    this.insightsResult = null;
    this.panelState = 'idle';
  }

  analyzeEvent(): void {
    if (!this.insightsEventId) return;
    this.search();
  }

  // ══════════════════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════════════════

  get canSearch(): boolean {
    if (this.isBusy) return false;
    switch (this.activeMode) {
      case 'smart-match': return !!this.userQuery.trim();
      case 'insights':    return !!this.insightsEventId;
      case 'advisor':     return !!this.userQuery.trim();
      case 'compare':     return this.compareIds.length >= 2;
    }
  }

  get selectedCategoryName(): string {
    if (this.categoryFilter == null) return 'All categories';
    return this.categories.find(c => c.id === this.categoryFilter)?.name ?? 'Filtered';
  }

  get badgeCount(): number {
    switch (this.activeMode) {
      case 'smart-match': return this.enrichedMatches.length;
      case 'compare':     return this.compareIds.length;
      default: return 0;
    }
  }

  get elapsedFormatted(): string {
    const s  = Math.floor(this.elapsedMs / 1000);
    const ms = Math.floor((this.elapsedMs % 1000) / 100);
    return `${s}.${ms}s`;
  }

  useExample(ex: string): void {
    this.userQuery = ex;
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 50);
  }

  useFollowUp(q: string): void {
    this.userQuery = q;
    this.search();
  }

  toggleSelectMatch(id: number): void {
    this.selectedMatchId = this.selectedMatchId === id ? null : id;
  }

  openEvent(id: number): void {
    this.eventSelected.emit(id);
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  fillPct(event: EventSummary): number {
    if (!event.maxParticipants) return 0;
    return Math.round(((event.maxParticipants - event.remainingSlots) / event.maxParticipants) * 100);
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  labelConfig(label: string): { text: string; cls: string } {
    const map: Record<string, { text: string; cls: string }> = {
      perfect: { text: '🏆 Perfect',   cls: 'badge--perfect' },
      great:   { text: '⭐ Great',     cls: 'badge--great' },
      good:    { text: '👍 Good',      cls: 'badge--good' },
      maybe:   { text: '🤔 Maybe',     cls: 'badge--maybe' },
    };
    return map[label] ?? { text: label, cls: 'badge--maybe' };
  }

  difficultyConfig(level: string): { text: string; cls: string } {
    const map: Record<string, { text: string; cls: string }> = {
      low:    { text: '🟢 Accessible', cls: 'diff--low' },
      medium: { text: '🟡 Intermediate', cls: 'diff--mid' },
      high:   { text: '🔴 Advanced',   cls: 'diff--high' },
    };
    return map[level] ?? { text: level, cls: 'diff--mid' };
  }

  sentimentEmoji(s: string): string {
    const map: Record<string, string> = {
      exciting:     '🎉',
      challenging:  '💪',
      relaxed:      '😌',
      competitive:  '🏆',
      educational:  '📚',
    };
    return map[s] ?? '✨';
  }

  eligibilityConfig(r: string): { text: string; cls: string } {
    const map: Record<string, { text: string; cls: string }> = {
      eligible:     { text: '✅ Eligible',      cls: 'elig--ok' },
      needs_check:  { text: '⚠️ Check required', cls: 'elig--warn' },
      not_eligible: { text: '❌ Not eligible',   cls: 'elig--block' },
    };
    return map[r] ?? { text: r, cls: 'elig--warn' };
  }

  compareEventById(id: number): EventSummary | undefined {
    return this.events.find(e => e.id === id);
  }

  isCompareWinner(id: number): boolean {
    return this.compareResult?.winner?.eventId === id;
  }

  reset(): void {
    this.userQuery      = '';
    this.petContext     = '';
    this.showPetCtx     = false;
    this.resetResults();
    this.insightsEventId = null;
    this.compareIds     = [];
    this.compareStep    = 'select';
    this.advisorMessages = [];
    this.conversationHist = [];
    this.stopTimer();
    this.stopThinkingAnimation();
    this.elapsedMs = 0;
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 50);
  }

  private resetResults(): void {
    this.panelState     = 'idle';
    this.enrichedMatches = [];
    this.summaryText    = '';
    this.generalAdvice  = '';
    this.insightsResult = null;
    this.compareResult  = null;
    this.selectedMatchId = null;
    this.errorMsg       = '';
    this.streamBuffer   = '';
    this.hasSearched    = false;
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.search();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  private finishBusy(): void {
    this.isBusy = false;
    this.stopTimer();
    this.stopThinkingAnimation();
  }

  private startTimer(): void {
    this.elapsedMs = 0;
    this.elapsedInterval = setInterval(() => (this.elapsedMs += 100), 100);
  }

  private stopTimer(): void {
    if (this.elapsedInterval) { clearInterval(this.elapsedInterval); this.elapsedInterval = null; }
  }

  private startThinkingAnimation(): void {
    const phrases = this.thinkingPhrases[this.activeMode];
    this.thinkingIndex  = 0;
    this.thinkingPhrase = phrases[0];
    if (this.thinkingInterval) clearInterval(this.thinkingInterval);
    this.thinkingInterval = setInterval(() => {
      this.thinkingIndex  = (this.thinkingIndex + 1) % phrases.length;
      this.thinkingPhrase = phrases[this.thinkingIndex];
    }, 1800);
  }

  private stopThinkingAnimation(): void {
    if (this.thinkingInterval) { clearInterval(this.thinkingInterval); this.thinkingInterval = null; }
  }

  private scrollChat(): void {
    setTimeout(() => {
      if (this.chatScrollEl?.nativeElement) {
        this.chatScrollEl.nativeElement.scrollTop =
          this.chatScrollEl.nativeElement.scrollHeight;
      }
    }, 50);
  }

  // Track fns
  trackExample(_: number, ex: string):        string { return ex; }
  trackMatch(_: number, m: EnrichedMatch):     number { return m.event.id; }
  trackMsg(_: number, m: AdvisorMessage):      number { return m.time.getTime(); }
  trackEvent(_: number, e: EventSummary):      number { return e.id; }
}