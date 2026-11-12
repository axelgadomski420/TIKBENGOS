// ai-event-assistant.service.ts
// Service IA unifié — 4 modes, historique conversationnel, gestion SSE robuste

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { EventSummary } from '../models/event.models';

// ══════════════════════════════════════════════════════════════
//  INTERFACES
// ══════════════════════════════════════════════════════════════

export type AssistantMode = 'smart-match' | 'insights' | 'advisor' | 'compare';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiAssistantRequest {
  query?: string;
  petContext?: string;
  categoryId?: number | null;
  maxEvents?: number;
  targetEventId?: number | null;
  compareEventIds?: number[];
  language?: string;
  conversationHistory?: ConversationTurn[];
}

// Smart Match
export interface EventMatch {
  eventId:         number;
  score:           number;
  label:           'perfect' | 'great' | 'good' | 'maybe';
  reason:          string;
  highlight:       string;
  eligible:        boolean;
  eligibilityNote?: string | null;
  tips:            string[];
}

export interface SmartMatchResult {
  summary:        string;
  matches:        EventMatch[];
  noMatchReason?: string;
  generalAdvice?: string;
}

export interface EnrichedMatch {
  event: EventSummary;
  match: EventMatch;
}

// Insights
export interface InsightsResult {
  eventName:     string;
  tldr:          string;
  targetAudience: {
    idealFor:        string[];
    notSuitableFor:  string[];
    experienceLevel: string;
  };
  logistics: {
    preparation: string[];
    whatToBring: string[];
    duration:    string;
    format:      string;
  };
  competitiveAnalysis: {
    isCompetition:    boolean;
    difficultyLevel:  string;
    scoringCriteria:  string;
    prizes:           string;
  };
  eligibilityCheck: {
    personalizedResult: 'eligible' | 'needs_check' | 'not_eligible';
    requirements:       string[];
    notes:              string;
  };
  insightScore: number;
  mustKnow:     string;
  sentiment:    string;
}

// Compare
export interface CompareResult {
  summary: string;
  events: Array<{
    eventId:       number;
    name:          string;
    pros:          string[];
    cons:          string[];
    bestFor:       string;
    score:         number;
    uniqueFactor:  string;
  }>;
  winner: {
    eventId: number;
    reason:  string;
  };
  ifUndecided: string;
  verdict:     string;
}

// Advisor
export interface AdvisorResult {
  type:              'advisor';
  message:           string;
  followUpQuestions: string[];
}

export type AiResult = SmartMatchResult | InsightsResult | CompareResult | AdvisorResult;

// Stream event
export interface StreamEvent {
  type:    'token' | 'done' | 'error';
  content: string;
  result?: AiResult;
  mode?:   AssistantMode;
}

// ══════════════════════════════════════════════════════════════
//  SERVICE
// ══════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class AiEventAssistantService {

  private readonly BASE = 'http://localhost:8087/elif/api/events/ai/assistant';

  // ── Smart Match ──────────────────────────────────────────────

  streamSmartMatch(
    query:      string,
    petContext?: string,
    categoryId?: number | null,
    maxEvents  = 20
  ): Observable<StreamEvent> {
    return this.stream('smart-match', { query, petContext, categoryId, maxEvents });
  }

  // ── Insights ─────────────────────────────────────────────────

  streamInsights(
    targetEventId: number,
    petContext?:   string,
    query?:        string
  ): Observable<StreamEvent> {
    return this.stream('insights', { targetEventId, petContext, query });
  }

  // ── Advisor ───────────────────────────────────────────────────

  streamAdvisor(
    query:               string,
    conversationHistory: ConversationTurn[] = [],
    categoryId?:         number | null
  ): Observable<StreamEvent> {
    return this.stream('advisor', { query, conversationHistory, categoryId });
  }

  // ── Compare ───────────────────────────────────────────────────

  streamCompare(
    compareEventIds: number[],
    petContext?:     string
  ): Observable<StreamEvent> {
    return this.stream('compare', { compareEventIds, petContext });
  }

  // ── Enrich matches ────────────────────────────────────────────

  enrichMatches(matches: EventMatch[], events: EventSummary[]): EnrichedMatch[] {
    return matches
      .map(match => {
        const event = events.find(e => e.id === match.eventId);
        return event ? { event, match } : null;
      })
      .filter((item): item is EnrichedMatch => item !== null);
  }

  // ── Core stream method ────────────────────────────────────────

  private stream(mode: AssistantMode, body: AiAssistantRequest): Observable<StreamEvent> {
    const subject = new Subject<StreamEvent>();
    this.fetchStream(mode, body, subject);
    return subject.asObservable();
  }

  private async fetchStream(
    mode:    AssistantMode,
    body:    AiAssistantRequest,
    subject: Subject<StreamEvent>
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      subject.next({
        type:    'error',
        content: 'The AI assistant took too long to respond. Please try again.',
        mode
      });
      subject.complete();
    }, 30_000);

    try {
      const response = await fetch(`${this.BASE}/stream/${mode}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        subject.next({
          type:    'error',
          content: `The AI assistant returned an error (${response.status}). ${errorText || 'Please try again.'}`,
          mode
        });
        subject.complete();
        return;
      }

      const reader  = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        subject.next({ type: 'error', content: 'Stream unavailable.', mode });
        subject.complete();
        return;
      }

      let buffer      = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.substring(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed: { type: string; content: string } = JSON.parse(jsonStr);

            if (parsed.type === 'token') {
              accumulated += parsed.content;
              subject.next({ type: 'token', content: accumulated, mode });

            } else if (parsed.type === 'done') {
              const rawJson = parsed.content?.trim();

              if (!rawJson) {
                subject.next({ type: 'error', content: 'Empty response from AI assistant.', mode });
                subject.complete();
                return;
              }

              try {
                const result = this.parseResult(mode, rawJson);
                subject.next({ type: 'done', content: rawJson, result, mode });
                subject.complete();
                return;
              } catch (parseErr) {
                console.error('Parse error:', parseErr, rawJson);
                subject.next({ type: 'error', content: 'Could not read AI response.', mode });
                subject.complete();
                return;
              }

            } else if (parsed.type === 'error') {
              subject.next({ type: 'error', content: parsed.content, mode });
              subject.complete();
              return;
            }
          } catch (chunkErr) {
            // Partial SSE chunk — continue
          }
        }
      }

      subject.complete();

    } catch (error: any) {
      clearTimeout(timeout);
      const msg = error?.name === 'AbortError'
        ? 'Request cancelled.'
        : error?.message?.includes('Failed to fetch')
          ? 'AI assistant is unreachable. Check your connection.'
          : 'An unexpected error occurred.';
      subject.next({ type: 'error', content: msg, mode });
      subject.complete();
    }
  }

  private parseResult(mode: AssistantMode, json: string): AiResult {
    const parsed = JSON.parse(json);

    if (mode === 'advisor') {
      // Advisor peut retourner du JSON ou du texte brut
      if (parsed && typeof parsed === 'object' && parsed.type === 'advisor') {
        return parsed as AdvisorResult;
      }
      // Texte brut → wrapper
      return { type: 'advisor', message: json, followUpQuestions: [] };
    }

    return parsed;
  }
}