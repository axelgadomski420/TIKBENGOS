import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type VirtualSessionStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface VirtualSessionResponse {
  id: number;
  eventId: number;
  eventTitle: string;
  roomUrl: string | null;
  earlyAccessMinutes: number;
  attendanceThresholdPercent: number;
  status: VirtualSessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  accessWindowStart: string;
  accessWindowEnd: string;
  canJoinNow: boolean;
  sessionStarted: boolean;
  isConfirmedParticipant: boolean;
  waitingForModerator: boolean;
  moderatorPassword: string | null;
  statusMessage: string;
}

export interface JoinSessionResponse {
  canJoin: boolean;
  roomUrl: string | null;
  accessToken: string | null;
  joinedAt: string | null;
  message: string;
  isModerator: boolean;
  isExternal: boolean;
  waitingForModerator: boolean;
}

export interface SessionStatsResponse {
  sessionId: number;
  eventTitle: string;
  totalRegistered: number;
  totalJoined: number;
  averageAttendance: number;
  certificatesEarned: number;
  participantDetails: AttendanceResponse[];
}

export interface AttendanceResponse {
  userId: number;
  userName: string;
  sessionId: number;
  joinedAt: string | null;
  leftAt: string | null;
  totalMinutesPresent: number;
  attendancePercent: number | null;
  certificateEarned: boolean;
  certificateUrl: string | null;
  currentlyConnected: boolean;
}

export interface CreateVirtualSessionRequest {
  earlyAccessMinutes: number;
  attendanceThresholdPercent: number;
  externalRoomUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class VirtualSessionService {
  private readonly eventsBase = 'http://localhost:8087/elif/api/events';
  private readonly certificatesBase = 'http://localhost:8087/elif/api/certificates';

  constructor(private http: HttpClient) {}

  createSession(
    eventId: number,
    adminId: number,
    request: CreateVirtualSessionRequest
  ): Observable<VirtualSessionResponse> {
    return this.http.post<VirtualSessionResponse>(
      `${this.eventsBase}/${eventId}/virtual`,
      request,
      { params: { userId: adminId.toString() } }
    );
  }

  getSession(eventId: number, userId: number | null): Observable<VirtualSessionResponse | null> {
    let params = new HttpParams();

    if (userId !== null) {
      params = params.set('userId', userId.toString());
    }

    return this.http.get<VirtualSessionResponse>(
      `${this.eventsBase}/${eventId}/virtual`,
      { params, observe: 'response' }
    ).pipe(
      map(response => response.status === 204 ? null : response.body),
      catchError(() => of(null))
    );
  }

  getSessionForAdmin(eventId: number, adminId: number): Observable<VirtualSessionResponse | null> {
    return this.http.get<VirtualSessionResponse>(
      `${this.eventsBase}/${eventId}/virtual/admin`,
      { params: { userId: adminId.toString() } }
    ).pipe(
      catchError(() => of(null))
    );
  }

  joinAsModerator(
    eventId: number,
    adminId: number,
    password: string
  ): Observable<JoinSessionResponse> {
    return this.http.post<JoinSessionResponse>(
      `${this.eventsBase}/${eventId}/virtual/join/moderator`,
      null,
      { params: { userId: adminId.toString(), password } }
    );
  }

  joinAsParticipant(eventId: number, userId: number): Observable<JoinSessionResponse> {
    return this.http.post<JoinSessionResponse>(
      `${this.eventsBase}/${eventId}/virtual/join/participant`,
      null,
      { params: { userId: userId.toString() } }
    );
  }

  leaveSession(eventId: number, userId: number): Observable<void> {
    return this.http.post<void>(
      `${this.eventsBase}/${eventId}/virtual/leave`,
      null,
      { params: { userId: userId.toString() } }
    ).pipe(
      catchError(() => of(void 0))
    );
  }

  getStats(eventId: number, adminId: number): Observable<SessionStatsResponse> {
    return this.http.get<SessionStatsResponse>(
      `${this.eventsBase}/${eventId}/virtual/stats`,
      { params: { userId: adminId.toString() } }
    );
  }

  getCertificateUrl(eventId: number, userId: number): string {
    return `${this.certificatesBase}/${eventId}/${userId}`;
  }

  getCertificateHtml(eventId: number, userId: number): Observable<string> {
    return this.http.get(
      this.getCertificateUrl(eventId, userId),
      { responseType: 'text' }
    ).pipe(
      catchError(() => of('<html><body>Certificate not available</body></html>'))
    );
  }

  sendCertificateEmail(eventId: number, userId: number): Observable<string> {
    return this.http.post(
      `${this.getCertificateUrl(eventId, userId)}/send`,
      null,
      { responseType: 'text' }
    );
  }

  openCertificate(eventId: number, userId: number): void {
    const url = this.getCertificateUrl(eventId, userId);
    const win = window.open(url, '_blank', 'noopener,noreferrer');

    if (!win) {
      window.location.assign(url);
    }
  }
}