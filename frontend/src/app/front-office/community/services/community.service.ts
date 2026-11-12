import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Community, CommunityMember, CommunityNotificationPreferences, CommunityRule, Flair } from '../models/community.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private api = environment.communityApiBaseUrl;

  constructor(private http: HttpClient) {}

  private headers(userId?: number, actingUserId?: number): { headers?: HttpHeaders } {
    if (!userId && !actingUserId) return {};

    let headers = new HttpHeaders();
    if (userId) {
      headers = headers.set('X-User-Id', String(userId));
    }
    if (actingUserId) {
      headers = headers.set('X-Act-As-User-Id', String(actingUserId));
    }

    return { headers };
  }

  getAll(userId?: number): Observable<Community[]> {
    return this.http.get<Community[]>(`${this.api}/communities`, this.headers(userId));
  }

  getBySlug(slug: string, userId?: number): Observable<Community> {
    return this.http.get<Community>(`${this.api}/communities/${slug}`, this.headers(userId));
  }

  create(payload: Partial<Community>, userId: number, actingUserId?: number): Observable<Community> {
    return this.http.post<Community>(`${this.api}/communities`, payload, this.headers(userId, actingUserId));
  }

  update(id: number, payload: Partial<Community>, userId: number): Observable<Community> {
    return this.http.put<Community>(`${this.api}/communities/${id}`, payload, this.headers(userId));
  }

  softDelete(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/communities/${id}`, this.headers(userId));
  }

  hardDelete(id: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/communities/${id}?hard=true`, this.headers(userId));
  }

  join(id: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.api}/communities/${id}/join`, {}, this.headers(userId));
  }

  leave(id: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.api}/communities/${id}/leave`, {}, this.headers(userId));
  }

  getNotificationPreferences(id: number, userId: number): Observable<CommunityNotificationPreferences> {
    return this.http.get<CommunityNotificationPreferences>(`${this.api}/communities/${id}/notification-preferences`, this.headers(userId));
  }

  updateNotificationPreferences(
    id: number,
    payload: Partial<CommunityNotificationPreferences>,
    userId: number
  ): Observable<CommunityNotificationPreferences> {
    return this.http.put<CommunityNotificationPreferences>(`${this.api}/communities/${id}/notification-preferences`, payload, this.headers(userId));
  }

  getRules(id: number): Observable<CommunityRule[]> {
    return this.http.get<CommunityRule[]>(`${this.api}/communities/${id}/rules`);
  }

  addRule(id: number, payload: Partial<CommunityRule>, userId: number): Observable<CommunityRule> {
    return this.http.post<CommunityRule>(`${this.api}/communities/${id}/rules`, payload, this.headers(userId));
  }

  updateRule(id: number, ruleId: number, payload: Partial<CommunityRule>, userId: number): Observable<CommunityRule> {
    return this.http.put<CommunityRule>(`${this.api}/communities/${id}/rules/${ruleId}`, payload, this.headers(userId));
  }

  deleteRule(id: number, ruleId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/communities/${id}/rules/${ruleId}`, this.headers(userId));
  }

  getFlairs(id: number): Observable<Flair[]> {
    return this.http.get<Flair[]>(`${this.api}/communities/${id}/flairs`);
  }

  addFlair(id: number, payload: Partial<Flair>, userId: number): Observable<Flair> {
    return this.http.post<Flair>(`${this.api}/communities/${id}/flairs`, payload, this.headers(userId));
  }

  updateFlair(id: number, flairId: number, payload: Partial<Flair>, userId: number): Observable<Flair> {
    return this.http.put<Flair>(`${this.api}/communities/${id}/flairs/${flairId}`, payload, this.headers(userId));
  }

  deleteFlair(id: number, flairId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/communities/${id}/flairs/${flairId}`, this.headers(userId));
  }

  getMembers(id: number, userId: number): Observable<CommunityMember[]> {
    return this.http.get<CommunityMember[]>(`${this.api}/communities/${id}/members`, this.headers(userId));
  }

  removeMember(id: number, targetUserId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/communities/${id}/members/${targetUserId}`, this.headers(userId));
  }

  promoteMemberToModerator(id: number, targetUserId: number, userId: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/communities/${id}/members/${targetUserId}/promote`, {}, this.headers(userId));
  }

  demoteModeratorToMember(id: number, targetUserId: number, userId: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/communities/${id}/members/${targetUserId}/demote`, {}, this.headers(userId));
  }
}
