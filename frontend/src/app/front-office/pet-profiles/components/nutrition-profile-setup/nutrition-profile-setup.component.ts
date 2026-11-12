import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-nutrition-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./nutrition-profile-setup.component.css'],
  template: `
    <div class="nutrition-profile-setup">
      <div class="setup-card">
        <div class="setup-header">
          <h3>
            <i class="fas fa-utensils"></i>
            Nutrition Profile Setup
          </h3>
          <p>Define your pet's dietary needs, goals, and preferences</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="nutrition-setup-form">
          <!-- Goal Selection -->
          <fieldset class="form-group">
            <legend>Primary Goal</legend>
            <div class="radio-group">
              <label class="radio-option" *ngFor="let goal of goalOptions">
                <input
                  type="radio"
                  formControlName="goal"
                  [value]="goal.value"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="radio-label">
                  <strong>{{ goal.label }}</strong>
                  <small>{{ goal.description }}</small>
                </span>
              </label>
            </div>
          </fieldset>

          <!-- Activity Level -->
          <fieldset class="form-group">
            <legend>Activity Level</legend>
            <div class="radio-group">
              <label class="radio-option" *ngFor="let level of activityLevelOptions">
                <input
                  type="radio"
                  formControlName="activityLevel"
                  [value]="level.value"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="radio-label">
                  <strong>{{ level.label }}</strong>
                  <small>{{ level.description }}</small>
                </span>
              </label>
            </div>
          </fieldset>

          <!-- Weight Settings -->
          <div class="form-row">
            <div class="form-field">
              <label for="targetWeight">Target Weight (kg)</label>
              <input
                id="targetWeight"
                type="number"
                min="0.1"
                step="0.1"
                formControlName="targetWeightKg"
                placeholder="e.g., 5.0"
              />
            </div>
            <div class="form-field">
              <label for="dailyCalories">Daily Calorie Target</label>
              <input
                id="dailyCalories"
                type="number"
                min="50"
                max="5000"
                formControlName="dailyCalorieTarget"
                placeholder="e.g., 250"
              />
            </div>
          </div>

          <!-- Meal Configuration -->
          <div class="form-row">
            <div class="form-field">
              <label for="mealsPerDay">Meals Per Day</label>
              <select formControlName="mealsPerDay" id="mealsPerDay">
                <option *ngFor="let num of mealsPerDayOptions" [value]="num">{{ num }} meals</option>
              </select>
            </div>
            <div class="form-field">
              <label for="foodPreference">Food Preference</label>
              <input
                id="foodPreference"
                type="text"
                formControlName="foodPreference"
                placeholder="e.g., Dry, Wet, Mixed"
              />
            </div>
          </div>

          <!-- Allergies & Restrictions -->
          <div class="form-field">
            <label for="allergies">Allergies (comma-separated)</label>
            <input
              id="allergies"
              type="text"
              formControlName="allergies"
              placeholder="e.g., Chicken, Dairy, Corn"
            />
            <small>Leave blank if no known allergies</small>
          </div>

          <div class="form-field">
            <label for="forbidden">Forbidden Ingredients (comma-separated)</label>
            <input
              id="forbidden"
              type="text"
              formControlName="forbiddenIngredients"
              placeholder="e.g., Chocolate, Onion, Grapes"
            />
            <small>Additional ingredients to avoid (besides allergies)</small>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button type="button" class="btn-ghost" [disabled]="saving" (click)="onCancel()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="saving || form.invalid">
              <i class="fas" [ngClass]="saving ? 'fa-spinner fa-spin' : 'fa-check'"></i>
              {{ saving ? 'Saving...' : 'Save & Generate Plan' }}
            </button>
          </div>

          <!-- Form Errors -->
          <div *ngIf="formError" class="form-error">
            <i class="fas fa-triangle-exclamation"></i>
            {{ formError }}
          </div>
        </form>
      </div>
    </div>
  `
})
export class NutritionProfileSetupComponent implements OnInit {
  @Input() saving = false;
  @Output() submitted = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  formError: string | null = null;

  readonly goalOptions = [
    { value: 'MAINTAIN', label: 'Maintain Weight', description: 'Keep current weight stable' },
    { value: 'WEIGHT_LOSS', label: 'Weight Loss', description: 'Healthy, gradual weight reduction' },
    { value: 'WEIGHT_GAIN', label: 'Weight Gain', description: 'Support healthy weight gain' },
    { value: 'MEDICAL_DIET', label: 'Medical Diet', description: 'Vet-prescribed therapeutic diet' }
  ];

  readonly activityLevelOptions = [
    { value: 'LOW', label: 'Sedentary', description: 'Indoor only, minimal activity' },
    { value: 'MODERATE', label: 'Moderate', description: 'Normal household activity' },
    { value: 'HIGH', label: 'Very Active', description: 'Regular outdoor/working activities' }
  ];

  readonly mealsPerDayOptions = [1, 2, 3, 4];

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Component lifecycle
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      goal: ['MAINTAIN', Validators.required],
      activityLevel: ['MODERATE', Validators.required],
      targetWeightKg: ['', [Validators.required, Validators.min(0.1)]],
      dailyCalorieTarget: ['', [Validators.required, Validators.min(50), Validators.max(5000)]],
      mealsPerDay: [2, [Validators.required, Validators.min(1), Validators.max(8)]],
      foodPreference: [''],
      allergies: [''],
      forbiddenIngredients: ['']
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.formError = null;
      this.submitted.emit(this.form.value);
    } else {
      this.formError = 'Please check all required fields and try again.';
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
