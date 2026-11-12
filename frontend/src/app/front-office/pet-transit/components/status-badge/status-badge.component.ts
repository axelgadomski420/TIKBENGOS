import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  SAFETY_STATUS_CONFIG,
  SafetyStatus,
  TRAVEL_PLAN_STATUS_CONFIG,
  TravelPlanStatus
} from '../../models/travel-plan.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input() status?: TravelPlanStatus;
  @Input() safetyStatus?: SafetyStatus;
  @Input() compact = false;

  get label(): string {
    return this.isSafety ? this.safetyConfig.label : this.statusConfig.label;
  }

  get iconName(): string {
    return this.isSafety ? this.safetyConfig.iconClass : this.statusConfig.iconClass;
  }

  get color(): string {
    return this.isSafety ? this.safetyConfig.color : this.statusConfig.color;
  }

  get bgColor(): string {
    return this.isSafety ? this.safetyConfig.bgColor : this.statusConfig.bgColor;
  }

  private get isSafety(): boolean {
    return !!this.safetyStatus;
  }

  private get statusConfig() {
    return TRAVEL_PLAN_STATUS_CONFIG[this.status ?? 'DRAFT'];
  }

  private get safetyConfig() {
    return SAFETY_STATUS_CONFIG[this.safetyStatus ?? 'PENDING'];
  }
}
