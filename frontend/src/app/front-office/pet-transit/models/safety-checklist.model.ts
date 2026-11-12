export type ChecklistCategory =
  | 'DOCUMENT'
  | 'TRANSPORT'
  | 'HEALTH'
  | 'COMFORT'
  | 'HYDRATION';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SafetyChecklistItem {
  id: number;
  travelPlanId: number;
  title: string;
  category: ChecklistCategory;
  priorityLevel: PriorityLevel;
  mandatory: boolean;
  completed: boolean;
  dueDate?: string;
  generatedByAi: boolean;
  completedAt?: string;
}

export interface ChecklistStats {
  totalItems: number;
  completedItems: number;
  totalMandatory: number;
  completedMandatory: number;
  completionPercentage: number;
  mandatoryCompletionPercentage: number;
}

export const CATEGORY_CONFIG: Record<
  ChecklistCategory,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  DOCUMENT: {
    label: 'Documents',
    icon: 'description',
    color: '#1565c0',
    bgColor: '#e3f2fd'
  },
  TRANSPORT: {
    label: 'Transport',
    icon: 'directions_car',
    color: '#e65100',
    bgColor: '#fff3e0'
  },
  HEALTH: {
    label: 'Health',
    icon: 'favorite',
    color: '#c62828',
    bgColor: '#ffebee'
  },
  COMFORT: {
    label: 'Comfort',
    icon: 'hotel',
    color: '#6a1b9a',
    bgColor: '#f3e5f5'
  },
  HYDRATION: {
    label: 'Hydration',
    icon: 'water_drop',
    color: '#0277bd',
    bgColor: '#e1f5fe'
  }
};

export const PRIORITY_CONFIG: Record<
  PriorityLevel,
  { label: string; color: string; bgColor: string }
> = {
  HIGH: {
    label: 'High',
    color: '#c62828',
    bgColor: '#ffebee'
  },
  MEDIUM: {
    label: 'Medium',
    color: '#e65100',
    bgColor: '#fff3e0'
  },
  LOW: {
    label: 'Low',
    color: '#2e7d32',
    bgColor: '#e8f5e9'
  }
};
