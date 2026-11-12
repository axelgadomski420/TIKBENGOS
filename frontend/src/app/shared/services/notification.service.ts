import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationPageResponse } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = environment.notificationsApiUrl;
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  list(userId: number, unreadOnly = false, page = 0, size = 10): Observable<NotificationPageResponse> {
    return this.http.get<NotificationPageResponse>(
      `${this.api}?unreadOnly=${unreadOnly}&page=${page}&size=${size}`,
      this.options(userId)
    ).pipe(
      tap((response) => this.unreadCountSubject.next(response.unreadCount ?? 0))
    );
  }

  markRead(userId: number, notificationId: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(
      `${this.api}/${notificationId}/read`,
      {},
      this.options(userId)
    ).pipe(
      tap(() => this.refreshUnreadCount(userId))
    );
  }

  markAllRead(userId: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/read-all`, {}, this.options(userId)).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  clearAll(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/clear-all`, this.options(userId)).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  clearOne(userId: number, notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${notificationId}`, this.options(userId)).pipe(
      tap(() => this.refreshUnreadCount(userId))
    );
  }

  refreshUnreadCount(userId: number): void {
    this.http.get<{ unreadCount: number }>(`${this.api}/unread-count`, this.options(userId))
      .subscribe({
        next: (response) => this.unreadCountSubject.next(response.unreadCount ?? 0),
        error: () => {
          // Keep UI resilient if notifications are temporarily unavailable.
        }
      });
  }

  private options(userId: number): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'X-User-Id': String(userId) }) };
  }
}
