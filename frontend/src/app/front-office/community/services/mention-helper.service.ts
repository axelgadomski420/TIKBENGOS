import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { ChatDirectoryUser, MessagingService } from './messaging.service';

export interface MentionCandidate {
  id: number;
  handle: string;
  displayName: string;
}

export interface MentionContext {
  start: number;
  end: number;
  query: string;
}

export interface MentionDeleteResult {
  handled: boolean;
  value: string;
  caret: number;
}

@Injectable({ providedIn: 'root' })
export class MentionHelperService {
  private candidatesCache: MentionCandidate[] | null = null;
  private loading$?: Observable<MentionCandidate[]>;

  constructor(private messagingService: MessagingService) {}

  loadCandidates(): Observable<MentionCandidate[]> {
    if (this.candidatesCache) {
      return of(this.candidatesCache);
    }

    if (this.loading$) {
      return this.loading$;
    }

    this.loading$ = this.messagingService.getUserDirectory().pipe(
      map((users) => this.toCandidates(users)),
      tap((candidates) => {
        this.candidatesCache = candidates;
      }),
      catchError(() => of([])),
      shareReplay(1)
    );

    return this.loading$;
  }

  filterCandidates(query: string, limit = 7): MentionCandidate[] {
    const normalized = (query || '').trim().toLowerCase();
    const candidates = this.candidatesCache ?? [];

    const filtered = normalized
      ? candidates.filter((candidate) =>
          candidate.handle.includes(normalized) || candidate.displayName.toLowerCase().includes(normalized)
        )
      : candidates;

    return filtered.slice(0, Math.max(1, Math.min(20, limit)));
  }

  resolveContext(value: string, caretIndex: number): MentionContext | null {
    const safeValue = value || '';
    const safeCaret = Math.max(0, Math.min(caretIndex, safeValue.length));
    const beforeCaret = safeValue.slice(0, safeCaret);
    const match = beforeCaret.match(/(?:^|[\s(])@([A-Za-z0-9._-]{0,50})$/);

    if (!match) {
      return null;
    }

    const query = (match[1] || '').toLowerCase();
    const mentionStart = beforeCaret.lastIndexOf('@');
    if (mentionStart < 0) {
      return null;
    }

    return {
      start: mentionStart,
      end: safeCaret,
      query
    };
  }

  applyMention(value: string, context: MentionContext, candidate: MentionCandidate): { value: string; caret: number } {
    const safeValue = value || '';
    const prefix = safeValue.slice(0, context.start);
    const suffix = safeValue.slice(context.end);
    const insertion = `@${candidate.handle} `;
    const nextValue = `${prefix}${insertion}${suffix}`;
    return {
      value: nextValue,
      caret: prefix.length + insertion.length
    };
  }

  applyAtomicMentionDelete(value: string, caretIndex: number, key: string): MentionDeleteResult {
    const safeValue = value || '';
    const safeCaret = Math.max(0, Math.min(caretIndex, safeValue.length));

    if ((key !== 'Backspace' && key !== 'Delete') || safeValue.length === 0) {
      return { handled: false, value: safeValue, caret: safeCaret };
    }

    const ranges = this.extractMentionRanges(safeValue);
    if (ranges.length === 0) {
      return { handled: false, value: safeValue, caret: safeCaret };
    }

    let targetRange: { start: number; end: number } | null = null;
    let includeTrailingSpace = false;

    if (key === 'Backspace') {
      if (safeCaret === 0) {
        return { handled: false, value: safeValue, caret: safeCaret };
      }

      const prevIndex = safeCaret - 1;
      if (safeValue.charAt(prevIndex) === ' ') {
        const mentionBeforeSpace = ranges.find((range) => range.end === prevIndex);
        if (mentionBeforeSpace) {
          targetRange = mentionBeforeSpace;
          includeTrailingSpace = true;
        }
      }

      if (!targetRange) {
        targetRange = ranges.find((range) => prevIndex >= range.start && prevIndex < range.end) || null;
      }
    } else {
      if (safeCaret >= safeValue.length) {
        return { handled: false, value: safeValue, caret: safeCaret };
      }

      targetRange = ranges.find((range) => safeCaret >= range.start && safeCaret < range.end) || null;
    }

    if (!targetRange) {
      return { handled: false, value: safeValue, caret: safeCaret };
    }

    let deleteEnd = targetRange.end;
    if (includeTrailingSpace && safeValue.charAt(deleteEnd) === ' ') {
      deleteEnd += 1;
    }

    let nextValue = `${safeValue.slice(0, targetRange.start)}${safeValue.slice(deleteEnd)}`;
    if (
      targetRange.start > 0
      && targetRange.start < nextValue.length
      && nextValue.charAt(targetRange.start - 1) === ' '
      && nextValue.charAt(targetRange.start) === ' '
    ) {
      nextValue = `${nextValue.slice(0, targetRange.start)}${nextValue.slice(targetRange.start + 1)}`;
    }

    return {
      handled: true,
      value: nextValue,
      caret: targetRange.start
    };
  }

  private toCandidates(users: ChatDirectoryUser[]): MentionCandidate[] {
    const byHandle = new Map<string, MentionCandidate>();

    (users || []).forEach((user) => {
      const handle = this.toHandle(user);
      if (!handle || byHandle.has(handle)) {
        return;
      }

      byHandle.set(handle, {
        id: user.id,
        handle,
        displayName: this.displayName(user, handle)
      });
    });

    return [...byHandle.values()].sort((a, b) => a.handle.localeCompare(b.handle));
  }

  private toHandle(user: ChatDirectoryUser): string | null {
    const source = user as unknown as Record<string, unknown>;
    const first = this.normalizeNamePart(
      user.firstName,
      source['firstname'],
      source['first_name'],
      source['givenName'],
      source['given_name']
    );
    const last = this.normalizeNamePart(
      user.lastName,
      source['lastname'],
      source['last_name'],
      source['familyName'],
      source['family_name']
    );

    const nameBased = this.normalizeHandle(`${first}.${last}`);
    if (nameBased.length >= 2) {
      return nameBased;
    }

    const email = String(user.email || '').trim().toLowerCase();
    if (!email.includes('@')) {
      return null;
    }

    const localPart = email.split('@')[0] || '';
    const localPartHandle = this.normalizeHandle(localPart);
    if (localPartHandle.length < 2) {
      return null;
    }

    return localPartHandle;
  }

  private displayName(user: ChatDirectoryUser, fallbackHandle: string): string {
    const source = user as unknown as Record<string, unknown>;
    const first = this.normalizeNamePart(
      user.firstName,
      source['firstname'],
      source['first_name'],
      source['givenName'],
      source['given_name']
    );
    const last = this.normalizeNamePart(
      user.lastName,
      source['lastname'],
      source['last_name'],
      source['familyName'],
      source['family_name']
    );

    const full = `${first} ${last}`.trim();
    if (full.length > 0) {
      return full;
    }

    const fullName = this.normalizeNamePart(source['fullName'], source['full_name'], source['name']);
    if (fullName.length > 0) {
      return fullName;
    }

    return fallbackHandle;
  }

  private normalizeNamePart(...values: unknown[]): string {
    for (const value of values) {
      const normalized = String(value ?? '').trim();
      if (!normalized) {
        continue;
      }

      const lowered = normalized.toLowerCase();
      if (lowered === 'null' || lowered === 'undefined') {
        continue;
      }

      return normalized;
    }

    return '';
  }

  private normalizeHandle(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/^\.+|\.+$/g, '');
  }

  private extractMentionRanges(value: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const mentionPattern = /(?<![A-Za-z0-9_])@[A-Za-z0-9._-]{2,50}/g;
    let match: RegExpExecArray | null;

    while ((match = mentionPattern.exec(value)) !== null) {
      const mention = match[0] || '';
      const start = match.index;
      const end = start + mention.length;
      ranges.push({ start, end });
    }

    return ranges;
  }
}
