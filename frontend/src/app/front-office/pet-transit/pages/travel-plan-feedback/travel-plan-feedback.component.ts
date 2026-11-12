import { CommonModule } from '@angular/common';
import { ApplicationRef, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { SpeechMicButtonComponent } from '../../components/speech-mic-button/speech-mic-button.component';
import {
  FEEDBACK_TYPE_CONFIG,
  FeedbackType,
  TravelFeedback,
  TravelFeedbackCreateRequest
} from '../../models/travel-feedback.model';
import { TravelPlan } from '../../models/travel-plan.model';
import { AzureSpeechService } from '../../services/azure-speech.service';
import { TravelFeedbackService } from '../../services/travel-feedback.service';
import { TravelPlanService } from '../../services/travel-plan.service';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';

const FEEDBACK_TYPES: FeedbackType[] = ['REVIEW', 'SUGGESTION', 'INCIDENT', 'COMPLAINT'];

@Component({
  selector: 'app-travel-plan-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, SpeechMicButtonComponent],
  templateUrl: './travel-plan-feedback.component.html',
  styleUrl: './travel-plan-feedback.component.scss'
})
export class TravelPlanFeedbackComponent implements OnInit, OnDestroy {
  planId = 0;
  plan: TravelPlan | null = null;
  existingFeedbacks: TravelFeedback[] = [];

  loadingPlan = true;
  loadingFeedbacks = true;
  submitting = false;

  selectedType: FeedbackType | null = null;
  formVisible = false;

  formTitle = '';
  formMessage = '';
  preRecordingValues: Record<string, string> = {};
  formRating = 0;
  formHoverRating = 0;
  formIncidentLocation = '';
  form = new FormGroup({
    message: new FormControl<string>('', { nonNullable: true })
  });

  readonly feedbackTypes = FEEDBACK_TYPES;
  readonly typeConfig = FEEDBACK_TYPE_CONFIG;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly feedbackService: TravelFeedbackService,
    private readonly planService: TravelPlanService,
    private readonly toast: PetTransitToastService,
    private readonly azureSpeechService: AzureSpeechService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    const rawPlanId = this.route.snapshot.paramMap.get('planId');
    this.planId = Number(rawPlanId ?? 0);
    this.loadPlan();
    this.loadExistingFeedbacks();
  }

  ngOnDestroy(): void {
    void this.azureSpeechService.stopRecognition();
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectType(type: FeedbackType): void {
    this.selectedType = type;
    this.cdr.detectChanges();

    this.formRating = 0;
    this.formHoverRating = 0;
    this.formTitle = '';
    this.formMessage = '';
    this.formIncidentLocation = '';
    this.form.get('message')?.setValue('');
    this.form.get('message')?.markAsPristine();
    this.form.get('message')?.markAsUntouched();
    this.applyMessageValidators(type);
    this.formVisible = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.formVisible = true;
      this.cdr.detectChanges();
    }, 50);
  }

  setRating(rating: number): void {
    this.formRating = rating;
  }

  setHoverRating(rating: number): void {
    this.formHoverRating = rating;
  }

  clearHoverRating(): void {
    this.formHoverRating = 0;
  }

  onMessageChange(value: string): void {
    this.formMessage = value;
    this.form.get('message')?.setValue(value);
  }

  onMicStart(field: string): void {
    console.log('[FEEDBACK] onMicStart — field:', field,
      'current value:', this.form.get(field)?.value);
    this.preRecordingValues[field] =
      this.form.get(field)?.value ?? '';
  }

  onSpeechResult(field: string, text: string): void {
    console.log('[FEEDBACK] onSpeechResult — ',
      'field:', field, 'text:', text);

    // Azure SDK callbacks run OUTSIDE Angular's NgZone.
    // We must re-enter the zone so Angular detects
    // the change and updates the template.
    this.ngZone.run(() => {
      const base = this.preRecordingValues[field] ?? '';
      const newValue = base
        ? base.trim() + ' ' + text.trim()
        : text.trim();

      // Keep ngModel-backed textarea in sync with speech updates.
      if (field === 'message') {
        this.formMessage = newValue;
      }

      // Set via form control
      const control = this.form.get(field);
      if (control) {
        control.setValue(newValue, {
          emitEvent: true,
          onlySelf: false
        });
        control.markAsDirty();
        control.markAsTouched();
      }

      // Force full application tick —
      // this guarantees DOM update in ALL cases
      // including OnPush and nested components
      this.appRef.tick();

      console.log('[FEEDBACK] textarea updated to:',
        newValue);
      console.log('[FEEDBACK] form control value is now:',
        this.form.get(field)?.value);
    });
  }

  markMessageTouched(): void {
    this.form.get('message')?.markAsTouched();
  }

  effectiveRating(): number {
    return this.formHoverRating || this.formRating;
  }

  getTypeConfig(type: FeedbackType): (typeof FEEDBACK_TYPE_CONFIG)[FeedbackType] {
    return this.typeConfig[type];
  }

  isFormValid(): boolean {
    if (!this.selectedType) {
      return false;
    }

    if (this.selectedType === 'REVIEW' && this.formRating === 0) {
      return false;
    }

    if (
      this.selectedType === 'SUGGESTION' ||
      this.selectedType === 'INCIDENT' ||
      this.selectedType === 'COMPLAINT'
    ) {
      const messageControl = this.form.get('message');
      if (!messageControl || messageControl.invalid) {
        return false;
      }
    }

    if ((this.selectedType === 'INCIDENT' || this.selectedType === 'COMPLAINT') && !this.formMessage.trim()) {
      return false;
    }

    return true;
  }

  submit(): void {
    if (!this.selectedType || this.submitting) {
      return;
    }

    if (!this.isFormValid()) {
      this.form.get('message')?.markAsTouched();
      return;
    }

    const request: TravelFeedbackCreateRequest = {
      travelPlanId: this.planId,
      feedbackType: this.selectedType,
      title: this.formTitle.trim() || undefined,
      message: this.formMessage.trim() || undefined,
      rating: this.selectedType === 'REVIEW' ? this.formRating : undefined,
      incidentLocation:
        this.selectedType === 'INCIDENT' || this.selectedType === 'COMPLAINT'
          ? this.formIncidentLocation.trim() || undefined
          : undefined
    };

    this.submitting = true;

    this.feedbackService
      .createFeedback(this.planId, request)
      .pipe(
        finalize(() => (this.submitting = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.toast.showSuccess('Feedback submitted successfully.');
          this.onSubmitSuccess();
        },
        error: (error: Error) => {
          this.toast.error(error.message || 'Failed to submit feedback.');
        }
      });
  }

  onSubmitSuccess(): void {
    setTimeout(() => {
      this.loadExistingFeedbacks();
    }, 2800);
  }

  goBack(): void {
    this.navigateToMyPlans();
  }

  heroStyle(): Record<string, string> {
    const imageUrl = this.plan?.destinationCoverImageUrl;
    if (imageUrl) {
      return {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), url('${imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }

    return {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    };
  }

  formatDate(dateStr: string): string {
    if (!dateStr) {
      return '';
    }

    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  feedbackTypeLabel(type: FeedbackType): string {
    return FEEDBACK_TYPE_CONFIG[type]?.label ?? type;
  }

  feedbackStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      IN_PROGRESS: 'In Progress',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed'
    };
    return labels[status] ?? status;
  }

  trackByFeedback(_: number, feedback: TravelFeedback): number {
    return feedback.id;
  }

  private loadPlan(): void {
    this.loadingPlan = true;

    this.planService
      .getTravelPlanById(this.planId)
      .pipe(
        finalize(() => (this.loadingPlan = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (plan) => (this.plan = plan),
        error: () => {
          this.plan = null;
        }
      });
  }

  private loadExistingFeedbacks(): void {
    this.loadingFeedbacks = true;

    this.feedbackService
      .getFeedbacksForPlan(this.planId)
      .pipe(
        finalize(() => (this.loadingFeedbacks = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (feedbacks) => (this.existingFeedbacks = feedbacks ?? []),
        error: () => (this.existingFeedbacks = [])
      });
  }

  private navigateToMyPlans(): void {
    this.router.navigate(['/app/transit/plans/my']);
  }

  private applyMessageValidators(type: FeedbackType): void {
    const messageControl = this.form.get('message');
    if (!messageControl) {
      return;
    }

    if (
      type === 'SUGGESTION' ||
      type === 'INCIDENT' ||
      type === 'COMPLAINT'
    ) {
      messageControl.setValidators([Validators.required]);
    } else {
      messageControl.setValidators(null);
    }

    messageControl.updateValueAndValidity();
  }
}
