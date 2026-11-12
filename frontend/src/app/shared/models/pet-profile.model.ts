export type PetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'HAMSTER' | 'FISH' | 'REPTILE' | 'OTHER';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type PetTaskStatus = 'NOW' | 'NEXT' | 'DONE';
export type PetTaskUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PetTaskRecurrence = 'NONE' | 'DAILY' | 'WEEKLY';
export type PetNutritionGoal = 'WEIGHT_LOSS' | 'MAINTAIN' | 'WEIGHT_GAIN' | 'MEDICAL_DIET';
export type PetActivityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type PetFeedingStatus = 'GIVEN' | 'PARTIAL' | 'SKIPPED';

export interface PetProfile {
  id: number;
  userId: number;
  name: string;
  weight: number | null;
  species: PetSpecies;
  breed: string | null;
  dateOfBirth: string | null;
  ageDisplay: string; 
  gender: PetGender;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PetProfilePayload {
  name: string;
  weight: number | null;
  species: PetSpecies;
  breed: string | null;
  dateOfBirth: string | null;
  gender: PetGender;
  photoUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PetHealthRecord {
  id: number;
  petId: number;
  recordDate: string;
  visitType: string;
  veterinarian: string | null;
  clinicName: string | null;
  bloodType: string | null;
  spayedNeutered: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  previousOperations: string | null;
  vaccinationHistory: string | null;
  specialDiet: string | null;
  parasitePrevention: string | null;
  emergencyInstructions: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medications: string | null;
  notes: string | null;
  nextVisitDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PetHealthRecordPayload {
  recordDate: string;
  visitType: string;
  veterinarian: string | null;
  clinicName: string | null;
  bloodType: string | null;
  spayedNeutered: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  previousOperations: string | null;
  vaccinationHistory: string | null;
  specialDiet: string | null;
  parasitePrevention: string | null;
  emergencyInstructions: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medications: string | null;
  notes: string | null;
  nextVisitDate: string | null;
}

export interface PetCareTask {
  id: number;
  petId: number;
  title: string;
  category: string;
  urgency: PetTaskUrgency;
  status: PetTaskStatus;
  dueDate: string | null;
  notes: string | null;
  recurrence: PetTaskRecurrence;
  createdAt: string;
  updatedAt: string;
}

export interface PetCareTaskPayload {
  title: string;
  category: string;
  urgency: PetTaskUrgency;
  status: PetTaskStatus;
  dueDate: string | null;
  notes: string | null;
  recurrence: PetTaskRecurrence;
}

export interface PetNutritionProfile {
  id: number | null;
  petId: number;
  goal: PetNutritionGoal;
  activityLevel: PetActivityLevel;
  targetWeightKg: number | null;
  dailyCalorieTarget: number;
  mealsPerDay: number;
  foodPreference: string | null;
  allergies: string | null;
  forbiddenIngredients: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PetNutritionProfilePayload {
  goal: PetNutritionGoal;
  activityLevel: PetActivityLevel;
  targetWeightKg: number | null;
  dailyCalorieTarget: number;
  mealsPerDay: number;
  foodPreference: string | null;
  allergies: string | null;
  forbiddenIngredients: string | null;
}

export interface PetFeedingLog {
  id: number;
  petId: number;
  fedAt: string;
  mealLabel: string | null;
  foodName: string;
  portionGrams: number;
  caloriesActual: number;
  status: PetFeedingStatus;
  note: string | null;
  createdAt: string;
}

export interface PetFeedingLogPayload {
  fedAt: string;
  mealLabel: string | null;
  foodName: string;
  portionGrams: number;
  caloriesActual: number;
  status: PetFeedingStatus;
  note: string | null;
}

export interface PetNutritionSummary {
  dailyCalorieTarget: number;
  todayCalories: number;
  remainingCalories: number;
  plannedMealsPerDay: number;
  mealsLoggedToday: number;
  mealsCompletedToday: number;
  adherencePercent: number;
}

export interface PetNutritionTrendPoint {
  date: string;
  calories: number;
  target: number;
  meals: number;
  adherencePercent: number;
}

export interface PetNutritionInsights {
  periodDays: number;
  dailyCalorieTarget: number;
  averageDailyCalories: number;
  calorieTargetDelta: number;
  adherencePercent: number;
  completionRatePercent: number;
  streakDays: number;
  longestStreakDays: number;
  statusBreakdown: Record<string, number>;
  calorieTrend: PetNutritionTrendPoint[];
  recommendations: string[];
}

export interface PetPhotoProfileAnalysis {
  species: PetSpecies;
  breed: string | null;
  gender: PetGender;
  suggestedName: string | null;
  estimatedAgeMonths: number | null;
  estimatedWeightKg: number | null;
  confidence: number;
  summary: string | null;
  detectedTraits: string[];
  notes: string[];
  disclaimer: string;
  sourceModel: string;
}

export interface AdminPetBulkUpdatePayload {
  petIds: number[];
  species?: PetSpecies;
  gender?: PetGender;
  breed?: string;
}

export interface AdminPetBulkDeletePayload {
  petIds: number[];
}

export interface AdminPetBulkOperationResult {
  requested: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

export interface AdminPetDashboardStats {
  totalPets: number;
  petsWithPhoto: number;
  petsWithGps: number;
  createdLast30Days: number;
  updatedLast7Days: number;
  speciesBreakdown: Record<string, number>;
}
