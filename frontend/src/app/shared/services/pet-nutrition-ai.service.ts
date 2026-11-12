import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PetAIMealPlanResponse {
  petId: number;
  petName: string;
  petBreed: string;
  species: string;
  bodyConditionScore: number;
  merKcal: number;
  derKcal: number;
  nutrientTargets: NutrientTarget;
  healthFlags: string[];
  breedAdjustments: string[];
  options: MealPlanOption[];
  feedingSchedule: FeedingScheduleItem[];
  hardConstraintsApplied: string[];
  softConstraintsApplied: string[];
  safetyNotes: string[];
  transitionGuidance: string[];
  monitoringAlerts: string[];
  generatedAt: string;
  allergyStatus: string;
  confidenceScore: number;
}

export interface NutrientTarget {
  proteinPercent: string;
  fatPercent: string;
  carbsPercent: string;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  notes: string;
}

export interface MealPlanOption {
  optionNumber: number;
  name: string;
  overview: string;
  sections: MealSection[];
  totalDailyCalories: number;
  dietaryApproach: string;
  proteinPercentage: number;
  fatPercentage: number;
  carbsPercentage: number;
  highlights: string[];
}

export interface MealSection {
  title: string;
  totalCalories: number;
  items: MealItem[];
  notes: string;
}

export interface MealItem {
  food: string;
  portionGrams: number;
  calories: number;
  protein: string;
  fat: string;
  instructions: string;
}

export interface FeedingScheduleItem {
  time: string;
  note: string;
}

@Injectable({ providedIn: 'root' })
export class PetNutritionAIService {
  private readonly apiUrl = 'http://localhost:8087/elif/api/user-pets';

  constructor(private http: HttpClient) {}

  generateAIMealPlan(petId: number): Observable<PetAIMealPlanResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PetAIMealPlanResponse>(
      `${this.apiUrl}/${petId}/ai-meal-plan`,
      { headers }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const userId = this.resolveUserId();
    return new HttpHeaders({
      'X-User-Id': userId
    });
  }

  private resolveUserId(): string {
    const directUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (directUserId && directUserId.trim().length > 0) {
      return directUserId;
    }

    const sessionUserRaw = localStorage.getItem('elif_user') || sessionStorage.getItem('elif_user');
    if (sessionUserRaw) {
      try {
        const sessionUser = JSON.parse(sessionUserRaw) as { id?: number };
        if (sessionUser?.id && sessionUser.id > 0) {
          return String(sessionUser.id);
        }
      } catch {
        // Ignore malformed storage values and fail with explicit backend validation.
      }
    }

    return '';
  }
}
