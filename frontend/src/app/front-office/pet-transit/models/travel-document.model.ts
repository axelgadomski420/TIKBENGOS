export type DocumentType =
  | 'PET_PASSPORT'
  | 'RABIES_VACCINE'
  | 'HEALTH_CERTIFICATE'
  | 'TRANSPORT_AUTHORIZATION';

export type DocumentValidationStatus =
  | 'PENDING'
  | 'VALID'
  | 'EXPIRED'
  | 'REJECTED'
  | 'INCOMPLETE';

export interface TravelDocument {
  id: number;
  travelPlanId: number;
  documentType: DocumentType;
  fileUrl: string;
  documentNumber?: string;
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingOrganization?: string;
  extractedText?: string;
  isOcrProcessed: boolean;
  validationStatus: DocumentValidationStatus;
  validationComment?: string;
  uploadedAt: string;
  updatedAt: string;
  validatedAt?: string;
  validatedByAdminName?: string;
}

export const DOCUMENT_CONFIG: Record<
  DocumentType,
  {
    label: string;
    icon: string;
    description: string;
  }
> = {
  PET_PASSPORT: {
    label: 'Pet Passport',
    icon: 'pets',
    description: 'Official pet identification document'
  },
  RABIES_VACCINE: {
    label: 'Rabies Vaccine',
    icon: 'healing',
    description: 'Valid anti-rabies vaccination certificate'
  },
  HEALTH_CERTIFICATE: {
    label: 'Health Certificate',
    icon: 'assignment_turned_in',
    description: 'Veterinary health clearance certificate'
  },
  TRANSPORT_AUTHORIZATION: {
    label: 'Transport Authorization',
    icon: 'assignment',
    description: 'Official permission for pet transport'
  }
};

export const VALIDATION_STATUS_CONFIG: Record<
  DocumentValidationStatus,
  {
    label: string;
    icon: string;
    colorClass: string;
    bgColor: string;
    textColor: string;
  }
> = {
  PENDING: {
    label: 'Pending Review',
    icon: 'hourglass_empty',
    colorClass: 'status-pending',
    bgColor: '#fff3e0',
    textColor: '#e65100'
  },
  VALID: {
    label: 'Validated',
    icon: 'check_circle',
    colorClass: 'status-valid',
    bgColor: '#e8f5e9',
    textColor: '#2e7d32'
  },
  EXPIRED: {
    label: 'Expired',
    icon: 'event_busy',
    colorClass: 'status-expired',
    bgColor: '#ffebee',
    textColor: '#c62828'
  },
  REJECTED: {
    label: 'Rejected',
    icon: 'cancel',
    colorClass: 'status-rejected',
    bgColor: '#ffebee',
    textColor: '#c62828'
  },
  INCOMPLETE: {
    label: 'Incomplete',
    icon: 'warning',
    colorClass: 'status-incomplete',
    bgColor: '#fff8e1',
    textColor: '#f57f17'
  }
};
