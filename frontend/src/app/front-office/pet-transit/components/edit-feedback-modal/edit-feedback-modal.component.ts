import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import {
  FEEDBACK_TYPE_CONFIG,
  TravelFeedback,
  TravelFeedbackUpdateRequest
} from '../../models/travel-feedback.model';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';
import { TravelFeedbackService } from '../../services/travel-feedback.service';

@Component({
  selector: 'app-edit-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './edit-feedback-modal.component.html',
  styleUrl: './edit-feedback-modal.component.scss'
})
export class EditFeedbackModalComponent {
  @Input() planId!: number;
  @Input() set feedback(value: TravelFeedback | null) {
    this._feedback = value;
    this.patchFromFeedback();
  }

  get feedback(): TravelFeedback | null {
    return this._feedback;
  }

  @Output() updated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  title = '';
  message = '';
  rating = 0;
  hoverRating = 0;
  incidentLocation = '';

  isSaving = false;
  triedSubmit = false;

  readonly typeConfig = FEEDBACK_TYPE_CONFIG;

  private _feedback: TravelFeedback | null = null;

  constructor(
    private readonly feedbackService: TravelFeedbackService,
    private readonly toastService: PetTransitToastService
  ) {}

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('feedback-modal-backdrop')) {
      this.closeModal();
    }
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  setRating(value: number): void {
    this.rating = value;
  }

  setHoverRating(value: number): void {
    this.hoverRating = value;
  }

  clearHoverRating(): void {
    this.hoverRating = 0;
  }

  effectiveRating(): number {
    return this.hoverRating || this.rating;
  }

  isReview(): boolean {
    return this.feedback?.feedbackType === 'REVIEW';
  }

  isIncidentOrComplaint(): boolean {
    return this.feedback?.feedbackType === 'INCIDENT' || this.feedback?.feedbackType === 'COMPLAINT';
  }

  canSave(): boolean {
    if (!this.feedback || this.isSaving || !this.isValid()) {
      return false;
    }

    return this.hasEditableChanges();
  }

  submit(): void {
    this.triedSubmit = true;

    if (!this.feedback || this.isSaving || !this.isValid()) {
      return;
    }

    if (!this.hasEditableChanges()) {
      this.toastService.success('No changes to save.');
      this.closeModal();
      return;
    }

    const request = this.buildUpdatePayload();

    this.isSaving = true;

    this.feedbackService
      .updateFeedback(this.planId, this.feedback.id, request)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.updated.emit();
        },
        error: (error: Error) => {
          this.toastService.error(error.message || 'Failed to update feedback.');
        }
      });
  }

  private patchFromFeedback(): void {
    const feedback = this._feedback;
    if (!feedback) {
      this.title = '';
      this.message = '';
      this.rating = 0;
      this.hoverRating = 0;
      this.incidentLocation = '';
      this.triedSubmit = false;
      return;
    }

    this.title = feedback.title ?? '';
    this.message = feedback.message ?? '';
    this.rating = feedback.rating ?? 0;
    this.hoverRating = 0;
    this.incidentLocation = feedback.incidentLocation ?? '';
    this.triedSubmit = false;
  }

  private isValid(): boolean {
    if (this.isReview() && this.rating === 0) {
      return false;
    }

    if (this.isIncidentOrComplaint() && !this.message.trim()) {
      return false;
    }

    return true;
  }

  private buildUpdatePayload(): TravelFeedbackUpdateRequest {
    const feedback = this.feedback;
    if (!feedback) {
      return {};
    }

    const request: TravelFeedbackUpdateRequest = {
      travelPlanId: this.planId,
      feedbackType: feedback.feedbackType
    };

    const currentTitle = this.normalize(feedback.title);
    const nextTitle = this.normalize(this.title);
    if (currentTitle !== nextTitle) {
      request.title = nextTitle;
    }

    const currentMessage = this.normalize(feedback.message);
    const nextMessage = this.normalize(this.message);
    if (currentMessage !== nextMessage) {
      request.message = nextMessage;
    }

    if (this.isReview()) {
      const currentRating = feedback.rating ?? 0;
      if (currentRating !== this.rating) {
        request.rating = this.rating;
      }
    }

    if (this.isIncidentOrComplaint()) {
      const currentLocation = this.normalize(feedback.incidentLocation);
      const nextLocation = this.normalize(this.incidentLocation);
      if (currentLocation !== nextLocation) {
        request.incidentLocation = nextLocation;
      }
    }

    return request;
  }

  private hasEditableChanges(): boolean {
    const feedback = this.feedback;
    if (!feedback) {
      return false;
    }

    if (this.normalize(feedback.title) !== this.normalize(this.title)) {
      return true;
    }

    if (this.normalize(feedback.message) !== this.normalize(this.message)) {
      return true;
    }

    if (this.isReview() && (feedback.rating ?? 0) !== this.rating) {
      return true;
    }

    if (
      this.isIncidentOrComplaint() &&
      this.normalize(feedback.incidentLocation) !== this.normalize(this.incidentLocation)
    ) {
      return true;
    }

    return false;
  }

  private normalize(value: string | null | undefined): string {
    return String(value ?? '').trim();
  }
}
