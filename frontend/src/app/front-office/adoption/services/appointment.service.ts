import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'http://localhost:8087/elif/api/adoption';

  constructor(private http: HttpClient) {}

  // ============================================================
  // SCORES
  // ============================================================

  getScoredRequestsForPet(petId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/pet/${petId}/scored`);
  }

  getScoredRequestsForShelter(shelterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/shelter/${shelterId}/scored`);
  }

  // ============================================================
  // RENDEZ-VOUS
  // ============================================================

  scheduleAppointment(data: {
    requestId: number;
    appointmentDate: string;
    shelterNotes?: string;
    compatibilityScore?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments`, data);
  }

  respondAfterConsultation(appointmentId: number, result: string, responseMessage: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${appointmentId}/respond`, {
      result,
      responseMessage
    });
  }

  cancelAppointment(appointmentId: number, reason: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${appointmentId}/cancel`, { reason });
  }

  getAppointmentsByShelter(shelterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/shelter/${shelterId}`);
  }

  getUpcomingAppointments(shelterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/shelter/${shelterId}/upcoming`);
  }

  getAppointmentsByAdopter(adopterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/adopter/${adopterId}`);
  }

  getAppointmentsByRequest(requestId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/request/${requestId}`);
  }
}