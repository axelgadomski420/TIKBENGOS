// ai-description.service.ts — VERSION CORRIGÉE
//
// CORRECTIONS :
//  1. mapToRequest() : startDate/endDate envoyés en string ISO → le backend
//     les désérialise en LocalDateTime correctement
//  2. Meilleure gestion des erreurs réseau avec messages lisibles
//  3. Timeout fetch de 35 secondes (Gemini peut être lent)

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type GenerationTone = 'professional' | 'friendly' | 'exciting';
export type GenerationLang = 'fr' | 'en';
export type EventFormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'datetime'
  | 'select'
  | 'image'
  | 'toggle'
  | 'location'
  | 'url'
  | 'range';

export type EventFormModel = Record<string, unknown>;

export interface EventFormSchemaSection {
  id: string;
  label: string;
  description: string | null;
  step: number;
}

export interface EventFormSchemaField {
  key: string;
  sectionId: string;
  label: string;
  type: EventFormFieldType;
  required: boolean;
  defaultValue: unknown;
  placeholder: string | null;
  helperText: string | null;
  order: number;
  min: number | null;
  max: number | null;
  step: number | null;
  minLength: number | null;
  maxLength: number | null;
  dependsOn: string | null;
  visibleWhen: boolean | string | number | null;
  optionsSource: string | null;
}

export interface EventFormSchema {
  version: string;
  title: string;
  sections: EventFormSchemaSection[];
  fields: EventFormSchemaField[];
}

export interface GeneratedSchemaResult {
  schema: EventFormSchema;
  model?: EventFormModel;
}

export const AI_ENGLISH_INSTRUCTION =
  'Write in clear natural English with a helpful, polished tone. Keep the result specific to the event details and avoid generic filler.';

export interface RuleSummary {
  criteria: string;
  label:    string;
  value:    string;
  isHard:   boolean;
}

export interface GenerationContext {
  title:            string;
  categoryName:     string;
  categoryIcon:     string;
  isCompetition:    boolean;
  requiresApproval: boolean;
  location:         string;
  startDate:        string;   // format: "2026-05-15T10:00" (datetime-local)
  endDate:          string;
  maxParticipants:  number;
  isOnline:         boolean;
  rules:            RuleSummary[];
  tone:             GenerationTone;
  language:         GenerationLang;
}

export interface StreamChunk {
  type:    'token' | 'done' | 'error';
  content: string;
}

export interface GeneratedResult {
  text:           string;
  wordCount:      number;
  charCount:      number;
  elapsedSeconds: number;
  tone:           GenerationTone;
  language:       GenerationLang;
  generatedAt:    string;
}

@Injectable({ providedIn: 'root' })
export class AiDescriptionService {

  private readonly API_URL = 'http://localhost:8087/elif/api/events/ai';

  // ── Streaming (SSE) ───────────────────────────────────────────

  generateDescription(context: GenerationContext): Observable<StreamChunk> {
    const subject = new Subject<StreamChunk>();
    this.callStream(context, subject);
    return subject.asObservable();
  }

  // ── Sync ──────────────────────────────────────────────────────

  async generateDescriptionSync(context: GenerationContext): Promise<GeneratedResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000); // 35s timeout

    try {
      const response = await fetch(`${this.API_URL}/generate-sync`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(this.mapToRequest(context)),
        signal:  controller.signal
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(this.parseError(response.status, text));
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Privé : Stream SSE ────────────────────────────────────────

  private async callStream(
    context: GenerationContext,
    subject: Subject<StreamChunk>
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      subject.next({ type: 'error', content: 'Request timed out after 35 seconds.' });
      subject.complete();
    }, 35_000);

    try {
      const response = await fetch(`${this.API_URL}/generate-stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(this.mapToRequest(context)),
        signal:  controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        subject.next({ type: 'error', content: this.parseError(response.status, errText) });
        subject.complete();
        return;
      }

      const reader  = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        subject.next({ type: 'error', content: 'No response body from server.' });
        subject.complete();
        return;
      }

      let buffer = '';

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
            const parsed: StreamChunk = JSON.parse(jsonStr);

            if (parsed.type === 'token') {
              subject.next(parsed);
            } else if (parsed.type === 'done') {
              subject.next({ type: 'done', content: '' });
              subject.complete();
              return;
            } else if (parsed.type === 'error') {
              subject.next({ type: 'error', content: parsed.content });
              subject.complete();
              return;
            }
          } catch {
            // Chunk partiel → ignorer
          }
        }
      }

      subject.next({ type: 'done', content: '' });
      subject.complete();

    } catch (error: any) {
      clearTimeout(timeout);
      if (error?.name === 'AbortError') return; // timeout déjà géré
      subject.next({
        type:    'error',
        content: this.parseNetworkError(error?.message ?? 'Unknown error')
      });
      subject.complete();
    }
  }

  // ── Mapper ────────────────────────────────────────────────────

  private mapToRequest(ctx: GenerationContext): object {
    return {
      title:            ctx.title,
      categoryName:     ctx.categoryName,
      categoryIcon:     ctx.categoryIcon,
      isCompetition:    ctx.isCompetition,
      requiresApproval: ctx.requiresApproval,
      location:         ctx.location,
      // ✅ FIX : envoyer null si vide, pas une string vide
      startDate:        ctx.startDate?.trim() || null,
      endDate:          ctx.endDate?.trim()   || null,
      maxParticipants:  ctx.maxParticipants   || 0,
      isOnline:         ctx.isOnline          ?? false,
      rules:            ctx.rules             ?? [],
      tone:             ctx.tone,
      language:         ctx.language
    };
  }

  // ── Helpers erreurs ───────────────────────────────────────────

  private parseError(status: number, body: string): string {
    if (status === 429)
      return 'Rate limit reached (Gemini free tier: 15 req/min). Please wait a moment and try again.';
    if (status === 401 || status === 403)
      return 'Invalid or missing Gemini API key. Please check your server configuration.';
    if (status === 500)
      return 'Server error. Check the backend logs for details.';
    return `Server error ${status}: ${body.substring(0, 120)}`;
  }

  private parseNetworkError(msg: string): string {
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError'))
      return 'Cannot reach the server. Make sure the backend is running on port 8087.';
    if (msg.includes('Connection reset'))
      return 'Connection was interrupted. This can happen if Gemini is blocked by a firewall.';
    return `Network error: ${msg}`;
  }
}
