import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Message } from '../../../front-office/community/models/message.model';
import { environment } from '../../../../environments/environment';

export interface AdminConversation {
  id: number;
  participantOneId: number;
  participantTwoId: number;
  participantOneName: string;
  participantTwoName: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderId?: number;
  totalMessageCount: number;
  deletedMessageCount: number;
}

@Injectable({ providedIn: 'root' })
export class CommunityChatAdminService {
  private readonly api = environment.communityMessagesApiUrl;

  constructor(private http: HttpClient) {}

  private headers(userId?: number): { headers?: HttpHeaders } {
    if (!userId) {
      return {};
    }

    return { headers: new HttpHeaders({ 'X-User-Id': String(userId) }) };
  }

  getConversations(userId: number): Observable<AdminConversation[]> {
    return this.http.get<AdminConversation[]>(`${this.api}/admin/conversations`, this.headers(userId));
  }

  getConversationMessages(conversationId: number, userId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.api}/admin/conversations/${conversationId}`, this.headers(userId));
  }

  moderateDeleteMessage(messageId: number, userId: number): Observable<Message> {
    return this.http.delete<Message>(`${this.api}/admin/messages/${messageId}`, this.headers(userId));
  }
}
