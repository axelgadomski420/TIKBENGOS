import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PetProfileService } from '../../../../shared/services/pet-profile.service';

interface AIWizardResponse {
  species: string;
  breed: string | null;
  gender: string;
  suggestedName: string | null;
  estimatedAgeMonths: number | null;
  estimatedWeightKg: number | null;
  confidence: number;
  summary: string | null;
  detectedTraits: string[];
  notes: string[];
  disclaimer: string;
  sourceModel: string;
}

@Component({
  selector: 'app-ai-profile-wizard',
  templateUrl: './ai-profile-wizard.component.html',
  styleUrls: ['./ai-profile-wizard.component.css']
})
export class AIProfileWizardComponent {
  @Output() wizardComplete = new EventEmitter<any>();
  @Output() wizardCancelled = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  currentStep = 1;
  totalSteps = 3;
  
  // Photo upload
  selectedFile: File | null = null;
  photoPreviewUrl: string | null = null;
  isDragActive = false;
  
  // AI Analysis
  analyzing = false;
  aiResponse: AIWizardResponse | null = null;
  
  // Form
  profileForm: FormGroup;
  
  // UI State
  error = '';
  success = '';
  autoFilledFields: string[] = [];

  constructor(
    private fb: FormBuilder,
    private petProfileService: PetProfileService
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      species: ['', Validators.required],
      breed: ['', Validators.maxLength(100)],
      gender: ['', Validators.required],
      dateOfBirth: [''],
      weight: ['', [Validators.min(0.1)]],
      photoUrl: ['']
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Step Navigation
  // ─────────────────────────────────────────────────────────────

  nextStep(): void {
    if (this.currentStep === 1 && !this.selectedFile) {
      this.error = 'Please upload a photo to continue';
      return;
    }

    if (this.currentStep === 1 && this.selectedFile && !this.aiResponse) {
      this.analyzePhoto();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.error = '';
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = '';
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep || (step === 2 && this.aiResponse)) {
      this.currentStep = step;
      this.error = '';
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedFile;
      case 2:
        return !!(this.profileForm.get('name')?.valid && 
               this.profileForm.get('species')?.valid && 
               this.profileForm.get('gender')?.valid);
      case 3:
        return true; // Confirmation
      default:
        return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Photo Upload
  // ─────────────────────────────────────────────────────────────

  triggerFileInput(): void {
    if (this.photoPreviewUrl) {
      return; // Don't trigger if photo already selected
    }
    this.fileInput?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select an image file';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.error = 'Image must be 8MB or less';
      return;
    }

    this.selectedFile = file;
    this.photoPreviewUrl = URL.createObjectURL(file);
    this.error = '';
    this.aiResponse = null; // Reset AI response when new photo is selected
  }

  removePhoto(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.selectedFile = null;
    this.photoPreviewUrl = null;
    this.aiResponse = null;
    this.error = '';
  }

  // ─────────────────────────────────────────────────────────────
  // AI Analysis
  // ─────────────────────────────────────────────────────────────

  analyzePhoto(): void {
    if (!this.selectedFile) {
      this.error = 'No photo selected';
      return;
    }

    this.analyzing = true;
    this.error = '';

    const userId = this.getUserId();
    
    this.petProfileService.analyzePetPhotoForProfile(userId, this.selectedFile).subscribe({
      next: (response) => {
        this.aiResponse = response;
        this.analyzing = false;
        this.autoFillForm();
        this.currentStep = 2; // Move to analysis results
      },
      error: (err) => {
        this.analyzing = false;
        const status = (err as { status?: number })?.status ?? 0;
        const backendMessage = this.extractError(err);
        
        if (status === 404 || status === 405) {
          this.error = 'AI analysis endpoint is not available yet. Restart backend and try again.';
          return;
        }
        
        if (status >= 500) {
          const normalized = backendMessage.toLowerCase();
          if (normalized.includes('429') || normalized.includes('quota') || normalized.includes('resource_exhausted')) {
            this.error = 'AI provider quota exceeded (Gemini 429). Switch API key/project or wait for quota reset.';
            return;
          }
          if (normalized.includes('api key') || normalized.includes('permission') || normalized.includes('unauthenticated')) {
            this.error = 'Gemini API key/auth is invalid for this model. Check GEMINI_API_KEY and model access.';
            return;
          }
          this.error = 'AI service is reachable but failed to analyze this image. Check GEMINI settings and try another photo.';
          return;
        }
        
        this.error = backendMessage || 'AI analysis failed. Please try another pet photo.';
      }
    });
  }

  private autoFillForm(): void {
    if (!this.aiResponse) return;

    this.autoFilledFields = [];

    // Auto-fill basic info
    if (this.aiResponse.suggestedName) {
      this.profileForm.patchValue({ name: this.aiResponse.suggestedName });
      this.autoFilledFields.push('name');
    }

    if (this.aiResponse.species) {
      this.profileForm.patchValue({ species: this.aiResponse.species });
      this.autoFilledFields.push('species');
    }

    if (this.aiResponse.breed) {
      this.profileForm.patchValue({ breed: this.aiResponse.breed });
      this.autoFilledFields.push('breed');
    }

    if (this.aiResponse.gender) {
      this.profileForm.patchValue({ gender: this.aiResponse.gender });
      this.autoFilledFields.push('gender');
    }

    // Calculate date of birth from estimated age in months
    if (this.aiResponse.estimatedAgeMonths) {
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setMonth(birthDate.getMonth() - this.aiResponse.estimatedAgeMonths);
      const dateString = birthDate.toISOString().split('T')[0];
      this.profileForm.patchValue({ dateOfBirth: dateString });
      this.autoFilledFields.push('dateOfBirth');
    }

    if (this.aiResponse.estimatedWeightKg) {
      this.profileForm.patchValue({ weight: this.aiResponse.estimatedWeightKg });
      this.autoFilledFields.push('weight');
    }

    // Show success message
    this.success = 'Pet information detected! Please review the details below.';
  }

  // ─────────────────────────────────────────────────────────────
  // Form Submission
  // ─────────────────────────────────────────────────────────────

  submitProfile(): void {
    if (this.profileForm.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    const profileData = {
      ...this.profileForm.value,
      photoFile: this.selectedFile,
      aiAnalysis: this.aiResponse
    };

    this.wizardComplete.emit(profileData);
  }

  cancel(): void {
    this.wizardCancelled.emit();
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'Upload Pet Photo';
      case 2: return 'Review Pet Details';
      case 3: return 'Confirm & Create';
      default: return '';
    }
  }

  getStepDescription(): string {
    switch (this.currentStep) {
      case 1: return 'Upload a clear photo of your pet';
      case 2: return 'Review and adjust the detected information';
      case 3: return 'Review everything before creating the profile';
      default: return '';
    }
  }

  isFieldAutoFilled(fieldName: string): boolean {
    return this.autoFilledFields.includes(fieldName);
  }

  private getUserId(): number {
    const userIdStr = localStorage.getItem('userId');
    return userIdStr ? parseInt(userIdStr, 10) : 0;
  }

  private extractError(err: any): string {
    return err?.error?.error || err?.error?.message || err?.message || 'Analysis failed. Please try again.';
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }
}
