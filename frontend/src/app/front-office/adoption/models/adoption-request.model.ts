export type RequestStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AdoptionRequest {
  id?: number;
  petId: number;
  petName?: string;
  adopterId?: number;
  adopterName?: string;
  status?: RequestStatus;
  dateRequested?: Date;
  approvedDate?: Date;
  notes?: string;
  rejectionReason?: string;
  housingType?: string;
  hasGarden?: boolean;
  hasChildren?: boolean;
  otherPets?: string;
  experienceLevel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}