export type FeedbackType = 'REVIEW' | 'SUGGESTION' | 'INCIDENT' | 'COMPLAINT';
export type ProcessingStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TravelFeedbackAdmin {
  id: number;
  travelPlanId: number;
  destinationTitle: string;
  feedbackType: FeedbackType;
  rating?: number;
  title?: string;
  message?: string;
  incidentLocation?: string;
  aiSentimentScore: number;
  processingStatus: ProcessingStatus;
  adminResponse?: string;
  respondedByAdminName?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
}

export interface AdminFeedbackResponseRequest {
  adminResponse: string;
  processingStatus: ProcessingStatus;
}

export const FEEDBACK_TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: string; color: string; bgColor: string; borderColor: string }
> = {
  REVIEW: {
    label: 'Review',
    icon: 'star',
    color: '#d97706',
    bgColor: '#fff8e1',
    borderColor: '#f59e0b'
  },
  SUGGESTION: {
    label: 'Suggestion',
    icon: 'lightbulb',
    color: '#0891b2',
    bgColor: '#e0f7fa',
    borderColor: '#0891b2'
  },
  INCIDENT: {
    label: 'Incident',
    icon: 'warning',
    color: '#dc2626',
    bgColor: '#ffebee',
    borderColor: '#dc2626'
  },
  COMPLAINT: {
    label: 'Complaint',
    icon: 'report_problem',
    color: '#7c3aed',
    bgColor: '#f3e5f5',
    borderColor: '#7c3aed'
  }
};

export const PROCESSING_CONFIG: Record<
  ProcessingStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PENDING: {
    label: 'Pending',
    color: '#e65100',
    bgColor: '#fff3e0',
    icon: 'hourglass_empty'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#0891b2',
    bgColor: '#e0f7fa',
    icon: 'autorenew'
  },
  RESOLVED: {
    label: 'Resolved',
    color: '#2e7d32',
    bgColor: '#e8f5e9',
    icon: 'check_circle'
  },
  CLOSED: {
    label: 'Closed',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'lock'
  }
};
