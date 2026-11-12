import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FEEDBACK_TYPE_CONFIG,
  PROCESSING_STATUS_CONFIG,
  TravelFeedback
} from '../../models/travel-feedback.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-feedback-details-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './feedback-details-modal.component.html',
  styleUrl: './feedback-details-modal.component.scss'
})
export class FeedbackDetailsModalComponent {
  @Input() feedback!: TravelFeedback;
  @Output() closed = new EventEmitter<void>();

  readonly typeConfig = FEEDBACK_TYPE_CONFIG;
  readonly statusConfig = PROCESSING_STATUS_CONFIG;

  closeModal(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('feedback-modal-overlay')) {
      this.closeModal();
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '-';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  starsArray(rating: number | undefined): number[] {
    const safeRating = Math.round(Math.max(0, Math.min(5, Number(rating ?? 0))));
    return Array.from({ length: safeRating }, (_, index) => index);
  }

  emptyStarsArray(rating: number | undefined): number[] {
    const safeRating = Math.round(Math.max(0, Math.min(5, Number(rating ?? 0))));
    return Array.from({ length: 5 - safeRating }, (_, index) => index);
  }

  valueOrDash(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return normalized || '-';
  }
}
