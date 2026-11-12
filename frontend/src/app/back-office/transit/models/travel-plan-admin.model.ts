export type TravelPlanStatus =
  | 'DRAFT'
  | 'IN_PREPARATION'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type SafetyStatus = 'PENDING' | 'VALID' | 'ALERT' | 'INVALID';

export type DocumentValidationStatus = 'PENDING' | 'VALID' | 'REJECTED' | 'EXPIRED' | 'INCOMPLETE';

export interface TravelPlanSummary {
  id: number;
  ownerId: number;
  ownerName: string;
  petId: number;
  petName?: string;
  destinationId: number;
  destinationTitle: string;
  destinationCountry: string;
  origin: string;
  transportType: string;
  travelDate: string;
  returnDate?: string;
  readinessScore: number;
  safetyStatus: SafetyStatus;
  status: TravelPlanStatus;
  hasFeedback?: boolean;
  submittedAt?: string;
  createdAt: string;
}

export interface TravelPlanDetail extends TravelPlanSummary {
  estimatedTravelHours?: number;
  estimatedTravelCost?: number;
  currency?: string;
  animalWeight?: number;
  cageLength?: number;
  cageWidth?: number;
  cageHeight?: number;
  hydrationIntervalMinutes?: number;
  adminDecisionComment?: string;
  reviewedByAdminName?: string;
  reviewedAt?: string;
}

export interface TravelDocumentAdmin {
  id: number;
  travelPlanId: number;
  documentType: string;
  fileUrl: string;
  documentNumber?: string;
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingOrganization?: string;
  isOcrProcessed: boolean;
  validationStatus: DocumentValidationStatus;
  validationComment?: string;
  uploadedAt: string;
  validatedAt?: string;
  validatedByAdminName?: string;
}

export interface ChecklistItemAdmin {
  id: number;
  travelPlanId: number;
  title: string;
  description?: string;
  mandatory: boolean;
  completed: boolean;
}

export interface ChecklistStats {
  totalItems: number;
  completedItems: number;
  totalMandatory: number;
  completedMandatory: number;
  completionPercentage: number;
  mandatoryCompletionPercentage: number;
}
