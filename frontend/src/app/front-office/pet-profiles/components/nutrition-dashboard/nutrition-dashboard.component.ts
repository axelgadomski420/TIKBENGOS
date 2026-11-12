import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface NutritionDashboardData {
  todayCalories: number;
  dailyCalorieTarget: number;
  remainingCalories: number;
  adherencePercent: number;
  todayProteinGrams: number;
  todayFatGrams: number;
  todayCarbsGrams: number;
  todayWaterMl: number;
  dailyWaterTargetMl: number;
  waterAdherencePercent: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weightChangeKg: number;
  mealsLoggedToday: number;
  plannedMealsPerDay: number;
}

@Component({
  selector: 'app-nutrition-dashboard',
  templateUrl: './nutrition-dashboard.component.html',
  styleUrls: ['./nutrition-dashboard.component.css']
})
export class NutritionDashboardComponent implements OnChanges {
  @Input() data: NutritionDashboardData | null = null;
  @Input() loading = false;

  animatedCalories = 0;
  animatedProtein = 0;
  animatedFat = 0;
  animatedCarbs = 0;
  animatedWater = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.animateValues();
    }
  }

  private animateValues(): void {
    if (!this.data) return;

    this.animateNumber('animatedCalories', this.data.todayCalories, 800);
    this.animateNumber('animatedProtein', this.data.todayProteinGrams, 800);
    this.animateNumber('animatedFat', this.data.todayFatGrams, 800);
    this.animateNumber('animatedCarbs', this.data.todayCarbsGrams, 800);
    this.animateNumber('animatedWater', this.data.todayWaterMl, 800);
  }

  private animateNumber(property: keyof this, target: number, duration: number): void {
    const start = (this[property] as number) || 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);
      (this[property] as any) = Math.round(start + (target - start) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  get calorieProgress(): number {
    if (!this.data || this.data.dailyCalorieTarget === 0) return 0;
    return Math.min(100, (this.data.todayCalories / this.data.dailyCalorieTarget) * 100);
  }

  get waterProgress(): number {
    if (!this.data || this.data.dailyWaterTargetMl === 0) return 0;
    return Math.min(100, (this.data.todayWaterMl / this.data.dailyWaterTargetMl) * 100);
  }

  get calorieStatus(): 'low' | 'good' | 'high' {
    if (!this.data) return 'good';
    const percent = (this.data.todayCalories / this.data.dailyCalorieTarget) * 100;
    if (percent < 80) return 'low';
    if (percent > 110) return 'high';
    return 'good';
  }

  get waterStatus(): 'low' | 'good' | 'high' {
    if (!this.data) return 'good';
    const percent = (this.data.todayWaterMl / this.data.dailyWaterTargetMl) * 100;
    if (percent < 70) return 'low';
    if (percent > 120) return 'high';
    return 'good';
  }

  get weightTrend(): 'up' | 'down' | 'stable' {
    if (!this.data || !this.data.weightChangeKg) return 'stable';
    if (this.data.weightChangeKg > 0.1) return 'up';
    if (this.data.weightChangeKg < -0.1) return 'down';
    return 'stable';
  }

  get macroTotal(): number {
    if (!this.data) return 0;
    return this.data.todayProteinGrams + this.data.todayFatGrams + this.data.todayCarbsGrams;
  }

  getMacroPercent(value: number): number {
    const total = this.macroTotal;
    return total > 0 ? (value / total) * 100 : 0;
  }
}
