import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DestinationStatus } from '../../models/destination.model';

@Component({
  selector: 'app-destination-status-badge',
  templateUrl: './destination-status-badge.component.html',
  styleUrl: './destination-status-badge.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class DestinationStatusBadgeComponent {
  @Input({ required: true }) status!: DestinationStatus;

  get statusClass(): string {
    switch (this.status) {
      case 'PUBLISHED':
        return 'status-badge--published';
      case 'SCHEDULED':
        return 'status-badge--scheduled';
      case 'ARCHIVED':
        return 'status-badge--archived';
      case 'DRAFT':
      default:
        return 'status-badge--draft';
    }
  }

  get label(): string {
    switch (this.status) {
      case 'PUBLISHED':
        return 'Published';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'ARCHIVED':
        return 'Archived';
      case 'DRAFT':
      default:
        return 'Draft';
    }
  }
}

