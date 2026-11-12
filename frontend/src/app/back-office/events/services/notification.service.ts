
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationResponse {
  id: number;
  userId: number;
  actorUserId: number | null;
  type: string;
  title: string;
  message: string;
  deepLink: string | null;
  referenceType: string | null;
  referenceId: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private base = 'http://localhost:8087/elif/api/notifications';

  constructor(private http: HttpClient) {}

  private getHeaders(userId: number): HttpHeaders {
    return new HttpHeaders().set('X-User-Id', userId.toString());
  }

  getNotifications(userId: number, page = 0, size = 20, unreadOnly = false): Observable<NotificationPageResponse> {
    return this.http.get<NotificationPageResponse>(`${this.base}`, {
      headers: this.getHeaders(userId),
      params: { unreadOnly, page, size }
    });
  }

  getUnreadCount(userId: number): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.base}/unread-count`, {
      headers: this.getHeaders(userId)
    });
  }

  markAsRead(userId: number, notificationId: number): Observable<NotificationResponse> {
    return this.http.patch<NotificationResponse>(
      `${this.base}/${notificationId}/read`,
      {},
      { headers: this.getHeaders(userId) }
    );
  }

  markAllAsRead(userId: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/read-all`, {}, {
      headers: this.getHeaders(userId)
    });
  }

  clearOne(userId: number, notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${notificationId}`, {
      headers: this.getHeaders(userId)
    });
  }

  clearAll(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/clear-all`, {
      headers: this.getHeaders(userId)
    });
  }

  // ✅ WebSocket connection
  connectWebSocket(
    userId: number,
    onNotification: (notification: NotificationResponse) => void,
    onCount: (count: number) => void
  ): WebSocket {
    const socket = new WebSocket(`ws://localhost:8087/ws/notifications?userId=${userId}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        onNotification(data.payload);
      } else if (data.type === 'count') {
        onCount(data.payload);
      }
    };
    
    return socket;
  }
}