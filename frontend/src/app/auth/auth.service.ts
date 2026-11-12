import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  verified?: boolean;
}

export interface ShelterRegisterData {
  email: string;
  password: string;
  organizationName: string;
  address: string;
  phone?: string;
  licenseNumber?: string;
  description?: string;
  logoUrl?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = 'http://localhost:8087/elif/user';
  private readonly STORAGE_KEY = 'elif_user';
  private readonly USER_ID_KEY = 'userId';
  private readonly authState = new BehaviorSubject<SessionUser | null>(this.readStoredUser());

  readonly userChanges$ = this.authState.asObservable();

  constructor(private http: HttpClient) {}

  register(firstName: string, lastName: string, email: string, password: string, accountType: string): Observable<SessionUser> {
    return this.http.post<SessionUser>(`${this.api}/register`, { 
      firstName, lastName, email, password, accountType 
    }).pipe(
      tap(user => this.saveUser(user))
    );
  }

  // Nouvelle méthode pour l'inscription des refuges
  registerShelter(data: ShelterRegisterData): Observable<any> {
    return this.http.post(`${this.api}/register-shelter`, data);
  }

  login(email: string, password: string): Observable<SessionUser> {
    return this.http.post<SessionUser>(`${this.api}/login`, { email, password }).pipe(
      tap(user => this.saveUser(user))
    );
  }

  loginWithGoogle(idToken: string): Observable<SessionUser> {
    return this.http.post<SessionUser>(`${this.api}/google-auth`, { idToken }).pipe(
      tap(user => this.saveUser(user))
    );
  }

  forgotPassword(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.api}/reset-password`, { 
      token, newPassword, confirmPassword 
    });
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    this.authState.next(null);
  }

  getCurrentUser(): SessionUser | null {
    const user = this.readStoredUser();

    if (user?.id) {
      localStorage.setItem(this.USER_ID_KEY, String(user.id));
    }

    return user;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(...roles: string[]): boolean {
    const role = this.getCurrentUser()?.role?.toUpperCase();
    return !!role && roles.map((r) => r.toUpperCase()).includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isShelter(): boolean {
    return this.hasRole('SHELTER');
  }

  isVerifiedShelter(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'SHELTER' && user?.verified === true;
  }

  private saveUser(user: SessionUser): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(this.USER_ID_KEY, String(user.id));
    this.authState.next(user);
  }

  private readStoredUser(): SessionUser | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}