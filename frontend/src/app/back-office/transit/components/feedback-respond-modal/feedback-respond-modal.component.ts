import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  AdminFeedbackResponseRequest,
  FEEDBACK_TYPE_CONFIG,
  PROCESSING_CONFIG,
  ProcessingStatus,
  TravelFeedbackAdmin
} from '../../models/travel-feedback-admin.model';

@Component({
  selector: 'app-feedback-respond-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './feedback-respond-modal.component.html',
  styleUrl: './feedback-respond-modal.component.scss'
})
export class FeedbackRespondModalComponent implements OnChanges {
  @Input({ required: true }) feedback!: TravelFeedbackAdmin;
  @Input() submitting = false;
  @Input() readOnly = false;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<AdminFeedbackResponseRequest>();

  readonly statusOptions: ProcessingStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  readonly typeConfig = FEEDBACK_TYPE_CONFIG;
  readonly processingConfig = PROCESSING_CONFIG;

  readonly form;

  constructor(private readonly formBuilder: FormBuilder) {
    this.form = this.formBuilder.group({
      processingStatus: this.formBuilder.control<ProcessingStatus>('PENDING', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      adminResponse: this.formBuilder.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(3000)]
      })
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['feedback'] || !this.feedback) {
      return;
    }

    this.form.reset({
      processingStatus: this.feedback.processingStatus ?? 'PENDING',
      adminResponse: this.feedback.adminResponse ?? ''
    });
  }

  setProcessingStatus(status: ProcessingStatus): void {
    this.form.controls.processingStatus.setValue(status);
  }

  isStatusActive(status: ProcessingStatus): boolean {
    return this.form.controls.processingStatus.value === status;
  }

  close(): void {
    if (this.submitting && !this.readOnly) {
      return;
    }

    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  submit(): void {
    if (this.submitting || this.readOnly) {
      return;
    }

    this.form.markAllAsTouched();
    const normalized = this.form.controls.adminResponse.value.trim();

    if (!normalized) {
      this.form.controls.adminResponse.setErrors({ required: true });
      return;
    }

    if (this.form.invalid) {
      return;
    }

    this.submitted.emit({
      adminResponse: normalized,
      processingStatus: this.form.controls.processingStatus.value
    });
  }

  formatDateTime(value?: string): string {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return 'Not available';
    }

    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) {
      return normalized;
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(parsed));
  }

  feedbackEmoji(type: TravelFeedbackAdmin['feedbackType']): string {
    switch (type) {
      case 'REVIEW':
        return '?';
      case 'SUGGESTION':
        return '??';
      case 'INCIDENT':
        return '??';
      case 'COMPLAINT':
        return '??';
      default:
        return '??';
    }
  }

  displayClientName(feedback: TravelFeedbackAdmin): string {
    return String(feedback.ownerName ?? '').trim() || `Client #${feedback.travelPlanId}`;
  }

  isReview(feedback: TravelFeedbackAdmin): boolean {
    return feedback.feedbackType === 'REVIEW';
  }

  canShowLocation(feedback: TravelFeedbackAdmin): boolean {
    return Boolean(String(feedback.incidentLocation ?? '').trim());
  }

  responseFieldError(): string {
    const control = this.form.controls.adminResponse;
    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Response is required.';
    }

    if (control.hasError('maxlength')) {
      return 'Response is too long.';
    }

    return '';
  }
}
