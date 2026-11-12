// front-office/events/services/participant.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✅ Déplacer l'interface ici ou l'exporter depuis event.models.ts
export interface EventParticipant {
  id: number;
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  numberOfSeats: number;
  status: string;
  registeredAt: string;
}

export interface EventParticipantRequest {
  numberOfSeats: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const API = 'http://localhost:8087/elif/api';

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  constructor(private http: HttpClient) {}

  join(eventId: number, userId: number, body: EventParticipantRequest): Observable<EventParticipant> {
    return this.http.post<EventParticipant>(
      `${API}/events/${eventId}/join?userId=${userId}`, body
    );
  }

  leave(eventId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${API}/events/${eventId}/leave?userId=${userId}`);
  }

  getParticipants(eventId: number, adminId: number, page = 0): Observable<Page<EventParticipant>> {
    return this.http.get<Page<EventParticipant>>(
      `${API}/events/${eventId}/participants?requesterId=${adminId}&page=${page}`
    );
  }

  getPending(eventId: number, adminId: number, page = 0): Observable<Page<EventParticipant>> {
    return this.http.get<Page<EventParticipant>>(
      `${API}/events/${eventId}/participants/pending?adminId=${adminId}&page=${page}`
    );
  }

  approve(participantId: number, adminId: number): Observable<EventParticipant> {
    return this.http.patch<EventParticipant>(
      `${API}/events/participants/${participantId}/approve?adminId=${adminId}`, {}
    );
  }

  reject(participantId: number, adminId: number): Observable<EventParticipant> {
    return this.http.patch<EventParticipant>(
      `${API}/events/participants/${participantId}/reject?adminId=${adminId}`, {}
    );
  }

  getMyRegistrations(userId: number, page = 0): Observable<Page<EventParticipant>> {
    return this.http.get<Page<EventParticipant>>(
      `${API}/events/registrations/my?userId=${userId}&page=${page}`
    );
  }
}