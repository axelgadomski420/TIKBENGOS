import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Statistics {
  totalUsers: number;
  totalShelters: number;
  pendingShelters: number;
  verifiedShelters: number;
  totalPets: number;
  availablePets: number;
  adoptedPets: number;
  petsByCategory?: { [key: string]: number };  // ✅ AJOUTER CETTE LIGNE
  totalAdoptionRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests?: number;
  underReviewRequests?: number;
  totalContracts: number;
  totalRevenue: number;
  pendingReviews: number;
  approvedReviews?: number;
  totalReviews?: number;
}

export interface ShelterAdmin {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber?: string;
  verified: boolean;
  description?: string;
  logoUrl?: string;
  userId?: number;
  userEmail?: string;
  userVerified?: boolean;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  verified: boolean;
}

export interface AdoptionRequest {
  id: number;
  petId: number;
  petName: string;
  adopterId: number;
  adopterName: string;
  status: string;
  dateRequested: string;
  notes?: string;
  rejectionReason?: string;
  housingType?: string;
  hasGarden?: boolean;
  hasChildren?: boolean;
  otherPets?: string;
  experienceLevel?: string;
}

export interface Contract {
  id: number;
  numeroContrat: string;
  animalName: string;
  shelterName: string;
  adoptantName: string;
  dateAdoption: string;
  statut: string;
  conditionsSpecifiques?: string;
  fraisAdoption?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8087/elif/api/admin';
  private userApiUrl = 'http://localhost:8087/elif/user';

  constructor(private http: HttpClient) {}

  // ============================================================
  // STATISTIQUES
  // ============================================================

  getStatistics(): Observable<Statistics> {
    return this.http.get<Statistics>(`${this.apiUrl}/statistics`);
  }

  // ============================================================
  // GESTION DES REFUGES
  // ============================================================

  getAllShelters(): Observable<ShelterAdmin[]> {
    return this.http.get<ShelterAdmin[]>(`${this.apiUrl}/shelters`);
  }

  getShelterById(id: number): Observable<ShelterAdmin> {
    return this.http.get<ShelterAdmin>(`${this.apiUrl}/shelters/${id}`);
  }

  createShelter(shelter: any): Observable<ShelterAdmin> {
    return this.http.post<ShelterAdmin>(`${this.apiUrl}/shelters`, shelter);
  }

  updateShelter(id: number, shelter: any): Observable<ShelterAdmin> {
    return this.http.put<ShelterAdmin>(`${this.apiUrl}/shelters/${id}`, shelter);
  }

  deleteShelter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/shelters/${id}`);
  }

  // ============================================================
  // GESTION DES UTILISATEURS (Refuges en attente)
  // ============================================================

  getPendingShelters(): Observable<User[]> {
    return this.http.get<User[]>(`${this.userApiUrl}/admin/pending-shelters`);
  }

  approveShelter(userId: number): Observable<User> {
    return this.http.put<User>(`${this.userApiUrl}/admin/approve-shelter/${userId}`, {});
  }

  rejectShelter(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.userApiUrl}/admin/reject-shelter/${userId}`);
  }

  // ============================================================
  // GESTION DES ANIMAUX
  // ============================================================

  getAllPets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pets`);
  }

  getPetById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pets/${id}`);
  }

  createPet(pet: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/pets`, pet);
  }

  updatePet(id: number, pet: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/pets/${id}`, pet);
  }

  deletePet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/pets/${id}`);
  }

  // ============================================================
  // GESTION DES DEMANDES
  // ============================================================

  getAllRequests(): Observable<AdoptionRequest[]> {
    return this.http.get<AdoptionRequest[]>(`${this.apiUrl}/requests`);
  }

  updateRequestStatus(id: number, status: string, rejectionReason?: string): Observable<AdoptionRequest> {
    let url = `${this.apiUrl}/requests/${id}/status?status=${status}`;
    if (rejectionReason) {
      url += `&rejectionReason=${encodeURIComponent(rejectionReason)}`;
    }
    return this.http.put<AdoptionRequest>(url, {});
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/requests/${id}`);
  }

  // ============================================================
  // GESTION DES CONTRATS
  // ============================================================

  getAllContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.apiUrl}/contracts`);
  }

  updateContractStatus(id: number, status: string): Observable<Contract> {
    return this.http.put<Contract>(`${this.apiUrl}/contracts/${id}/status?status=${status}`, {});
  }

  deleteContract(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/contracts/${id}`);
  }

  downloadContractPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/contracts/${id}/pdf`, {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Accept': 'application/pdf'
      })
    });
  }

  // ============================================================
  // GESTION DES AVIS
  // ============================================================

  getPendingReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reviews/pending`);
  }

  approveReview(reviewId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reviews/${reviewId}/approve`, {});
  }

  rejectReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${reviewId}/reject`);
  }
}