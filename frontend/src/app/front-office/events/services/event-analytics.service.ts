import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

import type { EventAnalyticsSnapshot, PopularEventRanking } from '../models/event.models';

export type InteractionType =
  | 'VIEW'
  | 'SEARCH_CLICK'
  | 'DETAIL_OPEN'
  | 'WAITLIST_JOIN'
  | 'REVIEW_POSTED'
  | 'REGISTRATION';

@Injectable({ providedIn: 'root' })
export class EventAnalyticsService {
  private readonly eventsBase = 'http://localhost:8087/elif/api/events';
  private readonly sessionStorageKey = 'elif-events-analytics-session';
  private readonly sessionId = this.resolveSessionId();
  private readonly recentCalls = new Map<string, number>();
  private readonly debounceMs = 4000;
  private readonly rankingLimit$ = new BehaviorSubject<number>(6);

  readonly liveRanking$: Observable<PopularEventRanking[]> = this.rankingLimit$.pipe(
    distinctUntilChanged(),
    switchMap(limit =>
      timer(0, 15000).pipe(
        switchMap(() => this.http.get<PopularEventRanking[]>(`${this.eventsBase}/popular/live?limit=${limit}`))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(private http: HttpClient) {}

  watchEvent(eventId: number): Observable<EventAnalyticsSnapshot> {
    return timer(0, 12000).pipe(
      switchMap(() => this.http.get<EventAnalyticsSnapshot>(`${this.eventsBase}/${eventId}/analytics`)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  setRankingLimit(limit: number): void {
    this.rankingLimit$.next(limit);
  }

  track(eventId: number, type: InteractionType, userId?: number | null): void {
    const key = `${eventId}:${type}`;
    const now = Date.now();
    const lastCall = this.recentCalls.get(key);
    if (lastCall && now - lastCall < this.debounceMs) {
      return;
    }

    this.recentCalls.set(key, now);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Session-Id': this.sessionId,
    });

    this.http.post<void>(`${this.eventsBase}/${eventId}/track`, {
      type,
      userId: userId ?? null,
      sessionId: this.sessionId,
    }, { headers }).subscribe({ error: () => {} });
  }

  private resolveSessionId(): string {
    const existing = sessionStorage.getItem(this.sessionStorageKey);
    if (existing) {
      return existing;
    }

    const created = this.generateSessionId();
    sessionStorage.setItem(this.sessionStorageKey, created);
    return created;
  }

  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
      const random = (Math.random() * 16) | 0;
      const value = character === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }
}
