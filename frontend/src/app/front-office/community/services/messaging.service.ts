import { HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Conversation, Message } from '../models/message.model';
import { environment } from '../../../../environments/environment';

export interface ChatDirectoryUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface DirectMessageNotificationPreferences {
  emailOnUnreadDirectMessage: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private api = environment.communityMessagesApiUrl;
  private readonly userApi = environment.userApiUrl;
  private readonly backendHost = environment.backendBaseUrl;
  private readonly backendContext = environment.backendContextPath;

  constructor(private http: HttpClient) {}

  private headers(userId?: number): { headers?: HttpHeaders } {
    if (!userId) return {};
    return { headers: new HttpHeaders({ 'X-User-Id': String(userId) }) };
  }

  getInbox(userId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.api}/inbox`, this.headers(userId));
  }

  getPresenceSnapshot(userId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.api}/presence`, this.headers(userId));
  }

  getDirectMessagePreferences(userId: number): Observable<DirectMessageNotificationPreferences> {
    return this.http.get<DirectMessageNotificationPreferences>(`${this.api}/preferences`, this.headers(userId));
  }

  updateDirectMessagePreferences(
    payload: Partial<DirectMessageNotificationPreferences>,
    userId: number
  ): Observable<DirectMessageNotificationPreferences> {
    return this.http.put<DirectMessageNotificationPreferences>(`${this.api}/preferences`, payload, this.headers(userId));
  }

  getUserDirectory(): Observable<ChatDirectoryUser[]> {
    return this.http.get<ChatDirectoryUser[]>(`${this.userApi}/findAll`);
  }

  getMessages(id: number, userId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.api}/conversations/${id}`, this.headers(userId));
  }

  getAttachmentBlob(attachmentId: number, userId: number): Observable<Blob> {
    return this.http.get(`${this.api}/attachments/${attachmentId}/content`, {
      ...this.headers(userId),
      responseType: 'blob'
    });
  }

  startOrGet(otherUserId: number, userId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.api}/conversations?otherUserId=${otherUserId}`, {}, this.headers(userId));
  }

  send(conversationId: number, content: string, userId: number, replyToMessageId?: number | null): Observable<Message> {
    const payload: { content: string; replyToMessageId?: number } = { content };
    if (replyToMessageId != null) {
      payload.replyToMessageId = replyToMessageId;
    }

    return this.http.post<Message>(`${this.api}/conversations/${conversationId}/send`, payload, this.headers(userId));
  }

  sendImage(
    conversationId: number,
    file: File | null,
    content: string | null,
    userId: number,
    imageUrl?: string | null,
    replyToMessageId?: number | null
  ): Observable<Message> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    const normalizedContent = (content || '').trim();
    if (normalizedContent) {
      formData.append('content', normalizedContent);
    }

    const normalizedImageUrl = (imageUrl || '').trim();
    if (normalizedImageUrl) {
      formData.append('imageUrl', normalizedImageUrl);
    }

    if (replyToMessageId != null) {
      formData.append('replyToMessageId', String(replyToMessageId));
    }

    return this.http.post<Message>(`${this.api}/conversations/${conversationId}/send-image`, formData, this.headers(userId));
  }

  sendImageWithProgress(
    conversationId: number,
    file: File | null,
    content: string | null,
    userId: number,
    imageUrl?: string | null,
    replyToMessageId?: number | null
  ): Observable<HttpEvent<Message>> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    const normalizedContent = (content || '').trim();
    if (normalizedContent) {
      formData.append('content', normalizedContent);
    }

    const normalizedImageUrl = (imageUrl || '').trim();
    if (normalizedImageUrl) {
      formData.append('imageUrl', normalizedImageUrl);
    }

    if (replyToMessageId != null) {
      formData.append('replyToMessageId', String(replyToMessageId));
    }

    return this.http.post<Message>(`${this.api}/conversations/${conversationId}/send-image`, formData, {
      ...this.headers(userId),
      observe: 'events',
      reportProgress: true
    });
  }

  updateMessage(messageId: number, content: string, userId: number): Observable<Message> {
    return this.http.put<Message>(`${this.api}/messages/${messageId}`, { content }, this.headers(userId)).pipe(
      catchError(() => this.http.put<Message>(`${this.api}/${messageId}`, { content }, this.headers(userId)))
    );
  }

  resolveMediaUrl(rawUrl?: string | null): string {
    const normalized = (rawUrl ?? '').trim();
    if (!normalized) {
      return '';
    }

    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('data:') ||
      normalized.startsWith('blob:')
    ) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${this.backendHost}${this.backendContext}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.backendHost}${this.backendContext}/${normalized}`;
    }

    if (normalized.startsWith('/elif/')) {
      return `${this.backendHost}${normalized}`;
    }

    if (normalized.startsWith('/')) {
      return `${this.backendHost}${normalized}`;
    }

    return normalized;
  }

  markRead(conversationId: number, userId: number): Observable<void> {
    return this.http.put<void>(`${this.api}/conversations/${conversationId}/read`, {}, this.headers(userId));
  }

  deleteMessage(messageId: number, userId: number): Observable<Message> {
    return this.http.request<Message>('delete', `${this.api}/messages/${messageId}`, this.headers(userId)).pipe(
      catchError(() => this.http.request<Message>('delete', `${this.api}/${messageId}`, this.headers(userId)))
    );
  }
}
