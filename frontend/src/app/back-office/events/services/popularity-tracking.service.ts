// popularity-tracking.service.ts
// À placer dans : src/app/shared/services/popularity-tracking.service.ts
//
// ✅ CORRIGÉ : Service dédié au tracking de popularité
// - Génère et persiste un sessionId unique par onglet
// - Envoie le header X-Session-Id automatiquement
// - Fire-and-forget : jamais bloquant pour l'UX
// - Déduplique côté frontend (pas de double call en 5s)

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export type InteractionType =
  | 'VIEW'
  | 'SEARCH_CLICK'
  | 'DETAIL_OPEN'
  | 'WAITLIST_JOIN'
  | 'REVIEW_POSTED'
  | 'REGISTRATION';

@Injectable({ providedIn: 'root' })
export class PopularityTrackingService {

  private readonly BASE = 'http://localhost:8087/elif/api/events';

  /** sessionId unique par onglet (UUID v4 simple) */
  private readonly sessionId = this.generateSessionId();

  /** Anti-doublon local : eventId+type → timestamp dernier appel */
  private readonly recentCalls = new Map<string, number>();
  private readonly DEBOUNCE_MS = 5_000; // 5 secondes

  constructor(private http: HttpClient) {}

  /**
   * Track une interaction sur un événement.
   * Fire-and-forget : la Promise est ignorée, aucune erreur n'est propagée.
   *
   * @param eventId  ID de l'événement
   * @param type     Type d'interaction
   * @param userId   ID user connecté (null si anonyme)
   */
  track(eventId: number, type: InteractionType, userId?: number | null): void {
    const key = `${eventId}:${type}`;
    const now = Date.now();

    // Anti-doublon local
    const last = this.recentCalls.get(key);
    if (last && now - last < this.DEBOUNCE_MS) {
      return;
    }
    this.recentCalls.set(key, now);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Session-Id': this.sessionId,
    });

    const body = {
      type,
      userId: userId ?? null,
      sessionId: this.sessionId
    };

    // ✅ Fire-and-forget : subscribe() sans handler d'erreur intentionnel
    this.http
      .post<void>(`${this.BASE}/${eventId}/track`, body, { headers })
      .subscribe({ error: () => {} }); // silencieux
  }

  /** UUID v4 simple (pas besoin d'une librairie) */
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}