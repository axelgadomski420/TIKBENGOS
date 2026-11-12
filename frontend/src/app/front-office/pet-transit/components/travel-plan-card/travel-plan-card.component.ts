import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  DELETABLE_TRAVEL_PLAN_STATUSES,
  EDITABLE_TRAVEL_PLAN_STATUSES,
  TravelPlanStatus,
  TravelPlanSummary
} from '../../models/travel-plan.model';
import { ReadinessScoreComponent } from '../readiness-score/readiness-score.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-travel-plan-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, StatusBadgeComponent, ReadinessScoreComponent],
  templateUrl: './travel-plan-card.component.html',
  styleUrl: './travel-plan-card.component.scss'
})
export class TravelPlanCardComponent {
  @Input({ required: true }) plan!: TravelPlanSummary;

  @Output() details = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  onDetailsClick(): void {
    this.details.emit(this.plan.id);
  }

  onEditClick(event: MouseEvent): void {
    event.stopPropagation();
    this.edit.emit(this.plan.id);
  }

  onDeleteClick(event: MouseEvent): void {
    event.stopPropagation();
    this.delete.emit(this.plan.id);
  }

  canEdit(): boolean {
    return EDITABLE_TRAVEL_PLAN_STATUSES.includes(this.plan.status);
  }

  canDelete(): boolean {
    return DELETABLE_TRAVEL_PLAN_STATUSES.includes(this.plan.status);
  }

  isAwaitingReview(): boolean {
    return this.plan.status === 'SUBMITTED';
  }

  travelDateLabel(): string {
    return this.plan.travelDate ? new Date(this.plan.travelDate).toLocaleDateString() : 'Date not set';
  }

  createdLabel(): string {
    return this.plan.createdAt ? new Date(this.plan.createdAt).toLocaleDateString() : 'N/A';
  }

  bannerToneClass(): string {
    const statusToTone: Record<TravelPlanStatus, string> = {
      DRAFT: 'tone-draft',
      IN_PREPARATION: 'tone-prep',
      SUBMITTED: 'tone-submitted',
      APPROVED: 'tone-approved',
      REJECTED: 'tone-rejected',
      COMPLETED: 'tone-completed',
      CANCELLED: 'tone-cancelled'
    };

    return statusToTone[this.plan.status];
  }
}
