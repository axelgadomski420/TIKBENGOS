export type FeedbackType = 'REVIEW' | 'SUGGESTION' | 'INCIDENT' | 'COMPLAINT';
export type ProcessingStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TravelFeedback {
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
}

export interface TravelFeedbackCreateRequest {
  travelPlanId: number;
  feedbackType: FeedbackType;
  rating?: number;
  title?: string;
  message?: string;
  incidentLocation?: string;
}

export interface TravelFeedbackUpdateRequest {
  travelPlanId?: number;
  feedbackType?: FeedbackType;
  rating?: number;
  title?: string;
  message?: string;
  incidentLocation?: string;
}

export const FEEDBACK_TYPE_CONFIG: Record<
  FeedbackType,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    gradient: string;
    description: string;
    emoji: string;
  }
> = {
  REVIEW: {
    label: 'Write a Review',
    icon: 'star',
    color: '#d97706',
    bgColor: '#fff8e1',
    gradient: 'linear-gradient(135deg, #fff8e1, #fffbf0)',
    description: 'Share your travel experience',
    emoji: '\u2B50'
  },
  SUGGESTION: {
    label: 'Make a Suggestion',
    icon: 'lightbulb',
    color: '#0891b2',
    bgColor: '#e0f7fa',
    gradient: 'linear-gradient(135deg, #e0f7fa, #f0fdff)',
    description: 'Help us improve',
    emoji: '\uD83D\uDCA1'
  },
  INCIDENT: {
    label: 'Report an Incident',
    icon: 'warning',
    color: '#dc2626',
    bgColor: '#ffebee',
    gradient: 'linear-gradient(135deg, #ffebee, #fff5f5)',
    description: 'Something went wrong',
    emoji: '\u26A0\uFE0F'
  },
  COMPLAINT: {
    label: 'Submit a Complaint',
    icon: 'report_problem',
    color: '#7c3aed',
    bgColor: '#f3e5f5',
    gradient: 'linear-gradient(135deg, #f3e5f5, #faf5ff)',
    description: 'Formal complaint submission',
    emoji: '\uD83D\uDCCB'
  }
};

export const PROCESSING_STATUS_CONFIG: Record<
  ProcessingStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PENDING: {
    label: 'Pending',
    color: '#b45309',
    bgColor: '#fef3c7',
    icon: 'schedule'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#0891b2',
    bgColor: '#e0f7fa',
    icon: 'autorenew'
  },
  RESOLVED: {
    label: 'Resolved',
    color: '#15803d',
    bgColor: '#dcfce7',
    icon: 'check_circle'
  },
  CLOSED: {
    label: 'Closed',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'lock'
  }
};
