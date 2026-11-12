import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServiceBooking {
  id: number;
  user: any;
  petName: string;
  petType: string;
  petBreed: string;
  petAge: number;
  service: any;
  selectedOptions: any[];
  availability: any;
  bookingDate: string;
  status: string;
  totalPrice: number;
  user_id: number;
}

export interface ServiceBookingDTO {
  id?: number;
  userId: number;
  petName: string;
  petType: string;
  petBreed: string;
  petAge: number;
  serviceId: number;
  selectedOptionIds: number[];
  availabilityId: number;
  bookingDate?: string;
  status?: string;
  user_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  private apiUrl = 'http://localhost:8087/elif/api/service-bookings';

  constructor(private http: HttpClient) {}

  // 🔹 GET ALL
  getAll(): Observable<ServiceBooking[]> {
    return this.http.get<ServiceBooking[]>(this.apiUrl);
  }

  // 🔹 GET BY ID
  getById(id: number): Observable<ServiceBooking> {
    return this.http.get<ServiceBooking>(`${this.apiUrl}/${id}`);
  }

  // 🔹 CREATE BOOKING
  create(dto: ServiceBookingDTO): Observable<ServiceBooking> {
    return this.http.post<ServiceBooking>(this.apiUrl, dto);
  }

  // 🔹 UPDATE
  update(id: number, dto: ServiceBookingDTO): Observable<ServiceBooking> {
    return this.http.put<ServiceBooking>(`${this.apiUrl}/${id}`, dto);
  }

  // 🔹 DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // 🔹 FILTER BY USER
  findByUserId(userId: number): Observable<ServiceBooking[]> {
    return this.http.get<ServiceBooking[]>(`${this.apiUrl}/by-user/${userId}`);
  }

  // 🔹 FILTER BY SERVICE
  findByServiceId(serviceId: number): Observable<ServiceBooking[]> {
    return this.http.get<ServiceBooking[]>(`${this.apiUrl}/by-service/${serviceId}`);
  }

  // 🔹 FILTER BY STATUS
  findByStatus(status: string): Observable<ServiceBooking[]> {
    return this.http.get<ServiceBooking[]>(`${this.apiUrl}/by-status/${status}`);
  }

  // 🔹 APPROVE / REJECT
  approveBooking(id: number, accept: boolean): Observable<ServiceBooking> {
    const params = new HttpParams().set('accept', accept.toString());

    return this.http.put<ServiceBooking>(
      `${this.apiUrl}/${id}/approve`,
      {},
      { params }
    );
  }
getUserById(userId: number) {
  return this.http.get<any>(`http://localhost:8087/user/findById/${userId}`);
}
}