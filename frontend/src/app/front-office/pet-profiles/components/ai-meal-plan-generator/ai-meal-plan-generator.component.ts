import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PetNutritionAIService, PetAIMealPlanResponse, MealPlanOption } from '../../../../shared/services/pet-nutrition-ai.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ai-meal-plan-generator',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./ai-meal-plan-generator.component.css'],
  template: `
    <div class="ai-meal-plan-generator">
      <!-- Header + Generate Button -->
      <div class="ai-section-header">
        <div class="ai-header-left">
          <h2>
            <i class="fas fa-sparkles"></i> Meal Plan Generator
          </h2>
       </div>
        <button
          type="button"
          class="btn-primary btn-lg"
          [disabled]="loading || !canGenerate"
          (click)="generateMealPlan()"
          [class.btn-loading]="loading"
        >
          <i class="fas" [ngClass]="loading ? 'fa-spinner fa-spin' : 'fa-magic'"></i>
          {{ loading ? 'Generating...' : 'Generate Plan' }}
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="error" class="alert alert-error">
        <i class="fas fa-circle-exclamation"></i>
        <div>
          <strong>Unable to Generate Meal Plan</strong>
          <p>{{ error }}</p>
        </div>
      </div>

      <!-- No Nutrition Profile -->
      <div *ngIf="!canGenerate && !error" class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          <strong>Complete Your Nutrition Profile First</strong>
          <p>Create or update your pet's nutrition profile with goal, activity level, and meal preferences to generate an meal plan.</p>
        </div>
      </div>

      <!-- Meal Plan Generated -->
      <div *ngIf="mealPlan && !loading" class="ai-meal-plan-content">
        <!-- Pet Summary Card -->
        <div class="meal-plan-pet-summary">
          <div class="pet-summary-left">
            <div class="pet-summary-icon">
              <i class="fas" [ngClass]="getPetIcon()"></i>
            </div>
            <div>
              <h3>{{ mealPlan.petName }}</h3>
              <p>{{ mealPlan.petBreed || mealPlan.species }}</p>
            </div>
          </div>
          <div class="pet-summary-metrics">
            <article>
              <span>Energy Requirement</span>
              <strong>{{ mealPlan.derKcal }} kcal/day</strong>
            </article>
            <article>
              <span>Body Condition</span>
              <strong>{{ formatBCS(mealPlan.bodyConditionScore) }}</strong>
            </article>
            <article>
              <span>Confidence Score</span>
              <strong class="confidence-pill" [ngClass]="'confidence-' + getConfidenceLevel()">
                {{ mealPlan.confidenceScore }}%
              </strong>
            </article>
          </div>
        </div>

        <!-- Health & AI Context -->
        <div class="ai-context-panel">
          <div class="context-section" *ngIf="mealPlan.healthFlags.length">
            <h4><i class="fas fa-flag"></i> Health Flags Detected</h4>
            <ul class="flag-list">
              <li *ngFor="let flag of mealPlan.healthFlags; let i = index" [style.--i]="i">
                <span class="flag-chip">{{ formatFlag(flag) }}</span>
              </li>
            </ul>
          </div>

          <div class="context-section" *ngIf="mealPlan.breedAdjustments.length">
            <h4><i class="fas fa-leaf"></i> Breed Adjustments</h4>
            <ul class="adjustment-list">
              <li *ngFor="let adj of mealPlan.breedAdjustments; let i = index" [style.--i]="i">
                {{ adj }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Nutrient Targets -->
        <div class="nutrient-targets-card">
          <h4>Nutritional Targets</h4>
          <div class="nutrient-grid">
            <article class="nutrient-item">
              <div class="nutrient-label">Protein</div>
              <div class="nutrient-value">{{ mealPlan.nutrientTargets.proteinPercent }}</div>
              <div class="nutrient-detail">{{ mealPlan.nutrientTargets.proteinGrams }}g</div>
            </article>
            <article class="nutrient-item">
              <div class="nutrient-label">Fat</div>
              <div class="nutrient-value">{{ mealPlan.nutrientTargets.fatPercent }}</div>
              <div class="nutrient-detail">{{ mealPlan.nutrientTargets.fatGrams }}g</div>
            </article>
            <article class="nutrient-item">
              <div class="nutrient-label">Carbs</div>
              <div class="nutrient-value">{{ mealPlan.nutrientTargets.carbsPercent }}</div>
              <div class="nutrient-detail">{{ mealPlan.nutrientTargets.carbsGrams }}g</div>
            </article>
          </div>
          <p class="nutrient-notes">{{ mealPlan.nutrientTargets.notes }}</p>
        </div>

        <!-- Meal Plan Options Tabs -->
        <div class="meal-plan-options-shell">
          <div class="options-tab-nav">
            <button
              *ngFor="let option of mealPlan.options; let i = index"
              type="button"
              class="option-tab-btn"
              [class.option-tab-btn-active]="selectedOptionIndex === i"
              (click)="selectMealPlanOption(i)"
            >
              <span class="option-tab-num">Option {{ option.optionNumber }}</span>
              <span class="option-tab-name">{{ option.name }}</span>
            </button>
          </div>

          <div *ngIf="selectedOption" class="meal-plan-option-detail">
            <!-- Option Overview -->
            <div class="option-overview">
              <div>
                <h3>{{ selectedOption.name }}</h3>
                <p>{{ selectedOption.overview }}</p>
              </div>
              <div class="option-approach-chip" [ngClass]="'approach-' + selectedOption.dietaryApproach">
                {{ formatApproach(selectedOption.dietaryApproach) }}
              </div>
            </div>

            <!-- Option Highlights -->
            <ul class="meal-highlights">
              <li *ngFor="let highlight of selectedOption.highlights; let i = index" [style.--i]="i">
                <i class="fas fa-check-circle"></i>
                {{ highlight }}
              </li>
            </ul>

            <!-- Meal Sections -->
            <div class="meal-sections-grid">
              <div *ngFor="let section of selectedOption.sections; let i = index" 
                   class="meal-section-card" [style.--i]="i">
                <div class="meal-section-header">
                  <h4>{{ section.title }}</h4>
                  <span class="meal-calorie-badge">{{ section.totalCalories }} kcal</span>
                </div>

                <ul class="meal-items-list">
                  <li *ngFor="let item of section.items" class="meal-item">
                    <div class="meal-item-header">
                      <strong>{{ item.food }}</strong>
                      <span class="portion-badge">{{ item.portionGrams }}g</span>
                    </div>
                    <div class="meal-item-nutrition">
                      <span><strong>{{ item.calories }}</strong> kcal</span>
                      <span *ngIf="item.protein">{{ item.protein }} protein</span>
                      <span *ngIf="item.fat">{{ item.fat }} fat</span>
                    </div>
                    <p *ngIf="item.instructions" class="meal-item-instructions">
                      <i class="fas fa-info-circle"></i> {{ item.instructions }}
                    </p>
                  </li>
                </ul>

                <p *ngIf="section.notes" class="section-notes">{{ section.notes }}</p>
              </div>
            </div>

            <!-- Nutrition Breakdown -->
            <div class="nutrition-breakdown">
              <h4>Macronutrient Breakdown</h4>
              <div class="macro-chart">
                <div class="macro-segment" 
                     [style.width.%]="selectedOption.proteinPercentage"
                     style="background-color: #f59e0b; border-radius: 8px 0 0 8px;">
                </div>
                <div class="macro-segment" 
                     [style.width.%]="selectedOption.fatPercentage"
                     style="background-color: #ec4899;">
                </div>
                <div class="macro-segment" 
                     [style.width.%]="selectedOption.carbsPercentage"
                     style="background-color: #6366f1; border-radius: 0 8px 8px 0;">
                </div>
              </div>
              <div class="macro-legend">
                <span style="color: #f59e0b;"><strong>Protein:</strong> {{ selectedOption.proteinPercentage }}%</span>
                <span style="color: #ec4899;"><strong>Fat:</strong> {{ selectedOption.fatPercentage }}%</span>
                <span style="color: #6366f1;"><strong>Carbs:</strong> {{ selectedOption.carbsPercentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Feeding Schedule -->
        <div class="feeding-schedule-card">
          <h4><i class="fas fa-clock"></i> Recommended Feeding Schedule</h4>
          <div class="schedule-grid">
            <article *ngFor="let schedule of mealPlan.feedingSchedule; let i = index" 
                     class="schedule-item" [style.--i]="i">
              <div class="schedule-time">{{ schedule.time }}</div>
              <div class="schedule-note">{{ schedule.note }}</div>
            </article>
          </div>
        </div>

        <!-- Constraints Applied -->
        <div class="constraints-panel">
          <div class="constraint-section" *ngIf="mealPlan.hardConstraintsApplied.length">
            <h5><i class="fas fa-shield"></i> Safety Constraints Applied</h5>
            <ul>
              <li *ngFor="let constraint of mealPlan.hardConstraintsApplied">
                <i class="fas fa-check"></i> {{ constraint }}
              </li>
            </ul>
          </div>
          <div class="constraint-section" *ngIf="mealPlan.softConstraintsApplied.length">
            <h5><i class="fas fa-heart"></i> Preferences Honored</h5>
            <ul>
              <li *ngFor="let constraint of mealPlan.softConstraintsApplied">
                <i class="fas fa-star"></i> {{ constraint }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Safety Notes & Monitoring -->
        <div class="safety-monitoring-panel">
          <div class="safety-section" *ngIf="mealPlan.safetyNotes.length">
            <h5><i class="fas fa-triangle-exclamation"></i> Safety Notes</h5>
            <ul>
              <li *ngFor="let note of mealPlan.safetyNotes;">{{ note }}</li>
            </ul>
          </div>

          <div class="monitoring-section" *ngIf="mealPlan.monitoringAlerts.length">
            <h5><i class="fas fa-bell"></i> What to Monitor</h5>
            <ul>
              <li *ngFor="let alert of mealPlan.monitoringAlerts;">{{ alert }}</li>
            </ul>
          </div>

          <div class="transition-section" *ngIf="mealPlan.transitionGuidance.length">
            <h5><i class="fas fa-arrow-right-arrow-left"></i> Food Transition Plan (4 Weeks)</h5>
            <ol>
              <li *ngFor="let step of mealPlan.transitionGuidance;">{{ step }}</li>
            </ol>
          </div>
        </div>

        <!-- Allergy Status Badge -->
        <div class="allergy-status-banner" [ngClass]="'allergy-' + mealPlan.allergyStatus.toLowerCase()">
          <i class="fas" [ngClass]="getAllergyIcon()"></i>
          <div>
            <strong>Allergy Safety Status: {{ mealPlan.allergyStatus }}</strong>
            <p *ngIf="mealPlan.allergyStatus === 'DANGEROUS'">
              This plan has critical allergen concerns. Please consult with your veterinarian.
            </p>
            <p *ngIf="mealPlan.allergyStatus === 'CAUTION'">
              This plan includes mitigation strategies for known allergies.
            </p>
            <p *ngIf="mealPlan.allergyStatus === 'SAFE'">
              No known allergen concerns detected. Plan is safe for this pet.
            </p>
          </div>
        </div>

        <!-- Generated Timestamp -->
        <p class="generated-timestamp">
          <i class="fas fa-info-circle"></i>
          Generated: {{ formatDateTime(mealPlan.generatedAt) }}
        </p>
      </div>
    </div>
  `
})
export class AIMealPlanGeneratorComponent implements OnInit, OnDestroy, OnChanges {
  @Input() petId: number | null = null;
  @Input() nutritionProfileExists = false;
  @Input() autoGenerate = true;
  @Input() regenerateKey = 0;

  mealPlan: PetAIMealPlanResponse | null = null;
  selectedOptionIndex = 0;
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  get canGenerate(): boolean {
    return this.petId != null && this.nutritionProfileExists;
  }

  get selectedOption(): MealPlanOption | null {
    if (!this.mealPlan || !this.mealPlan.options[this.selectedOptionIndex]) {
      return null;
    }
    return this.mealPlan.options[this.selectedOptionIndex];
  }

  constructor(private aiService: PetNutritionAIService) {}

  ngOnInit(): void {
    this.tryAutoGenerate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['regenerateKey'] && !changes['regenerateKey'].firstChange) {
      this.generateMealPlan();
      return;
    }

    if (changes['petId'] || changes['nutritionProfileExists']) {
      this.tryAutoGenerate();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateMealPlan(): void {
    if (!this.petId || !this.canGenerate) return;

    this.loading = true;
    this.error = null;

    this.aiService
      .generateAIMealPlan(this.petId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plan) => {
          this.mealPlan = plan;
          this.selectedOptionIndex = 0;
          this.loading = false;
        },
        error: (err) => {
          this.error = this.extractErrorMessage(err);
          this.loading = false;
        }
      });
  }

  private extractErrorMessage(error: unknown): string {
    const httpError = error as HttpErrorResponse;
    const backendError = httpError?.error;

    if (typeof backendError === 'string' && backendError.trim()) {
      return backendError;
    }

    if (backendError?.message) {
      return backendError.message;
    }

    if (httpError?.status === 404) {
      return 'Meal plan endpoint not found. Restart backend with latest AI nutrition code.';
    }

    if (httpError?.status === 400) {
      return 'Your nutrition profile is incomplete or invalid. Please update it and try again.';
    }

    if (httpError?.status === 401 || httpError?.status === 403) {
      return 'Your session is missing or expired. Please log in again.';
    }

    return 'Failed to generate meal plan. Please ensure your nutrition profile is complete.';
  }

  private tryAutoGenerate(): void {
    if (this.autoGenerate && this.canGenerate && !this.loading && !this.mealPlan) {
      this.generateMealPlan();
    }
  }

  selectMealPlanOption(index: number): void {
    this.selectedOptionIndex = index;
  }

  getPetIcon(): string {
    if (!this.mealPlan) return 'fa-paw';
    switch (this.mealPlan.species) {
      case 'DOG': return 'fa-dog';
      case 'CAT': return 'fa-cat';
      case 'BIRD': return 'fa-dove';
      default: return 'fa-paw';
    }
  }

  formatBCS(bcs: number): string {
    if (bcs <= 3) return 'Underweight';
    if (bcs <= 4) return 'Below Ideal';
    if (bcs <= 6) return 'Ideal';
    if (bcs <= 7) return 'Overweight';
    return 'Obese';
  }

  getConfidenceLevel(): string {
    if (!this.mealPlan) return 'low';
    const score = this.mealPlan.confidenceScore;
    if (score >= 90) return 'high';
    if (score >= 75) return 'medium';
    return 'low';
  }

  formatFlag(flag: string): string {
    return flag
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  formatApproach(approach: string): string {
    const map: { [key: string]: string } = {
      'dry-food-primary': '🥣 Kibble Focus',
      'mixed-diet': '🥘 Mixed Diet',
      'wet-food': '🍲 Wet Food',
      'raw-based': '🥩 Raw-Based'
    };
    return map[approach] || approach;
  }

  formatDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  getAllergyIcon(): string {
    if (!this.mealPlan) return 'fa-info-circle';
    switch (this.mealPlan.allergyStatus) {
      case 'SAFE': return 'fa-circle-check';
      case 'CAUTION': return 'fa-triangle-exclamation';
      case 'DANGEROUS': return 'fa-circle-exclamation';
      default: return 'fa-info-circle';
    }
  }
}
