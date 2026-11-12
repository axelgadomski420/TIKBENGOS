import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface CreateAdminUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly api = 'http://localhost:8087/elif/user';
  private readonly sessionStorageKey = 'elif.session.user';

  constructor(private http: HttpClient) {}

  findAll(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.api}/findAll`);
  }

  create(payload: CreateAdminUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.api}/register`, payload);
  }

  deleteById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/delete`, { params: { id: String(id) } });
  }

  currentSessionUserId(): number | undefined {
    try {
      const raw = localStorage.getItem(this.sessionStorageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as { id?: number };
      return typeof parsed.id === 'number' ? parsed.id : undefined;
    } catch {
      return undefined;
    }
  }
}
