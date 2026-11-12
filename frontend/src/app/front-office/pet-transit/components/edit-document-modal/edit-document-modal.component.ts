import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { TravelDocumentResponse, TravelDocumentService } from '../../services/travel-document.service';
import { PetTransitToastService } from '../../services/pet-transit-toast.service';

@Component({
  selector: 'app-edit-document-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './edit-document-modal.component.html',
  styleUrl: './edit-document-modal.component.scss'
})
export class EditDocumentModalComponent {
  @Input() planId!: number;
  @Input() set document(value: TravelDocumentResponse | null) {
    this._document = value;
    this.patchFormFromDocument();
  }

  get document(): TravelDocumentResponse | null {
    return this._document;
  }

  @Output() updated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isSaving = false;
  selectedFile: File | null = null;

  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.group({
    documentNumber: [''],
    holderName: [''],
    issueDate: ['', [this.issueDateNotInFutureValidator(), this.issueBeforeExpiryValidator()]],
    expiryDate: ['', [this.expiryInFutureValidator(), this.expiryAfterIssueValidator()]],
    issuingOrganization: ['']
  });

  private _document: TravelDocumentResponse | null = null;

  constructor(
    private readonly travelDocumentService: TravelDocumentService,
    private readonly toastService: PetTransitToastService
  ) {
    this.form.controls.issueDate.valueChanges.subscribe(() => {
      this.form.controls.expiryDate.updateValueAndValidity({ emitEvent: false });
    });

    this.form.controls.expiryDate.valueChanges.subscribe(() => {
      this.form.controls.issueDate.updateValueAndValidity({ emitEvent: false });
    });
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    this.selectedFile = files && files.length > 0 ? files[0] : null;
  }

  submit(): void {
    if (this.isSaving || !this.document || !this.planId) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = new FormData();

    this.appendIfPresent(formData, 'documentNumber', this.form.value.documentNumber);
    this.appendIfPresent(formData, 'holderName', this.form.value.holderName);
    this.appendIfPresent(formData, 'issueDate', this.form.value.issueDate);
    this.appendIfPresent(formData, 'expiryDate', this.form.value.expiryDate);
    this.appendIfPresent(formData, 'issuingOrganization', this.form.value.issuingOrganization);

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.isSaving = true;

    this.travelDocumentService
      .updateDocument(this.planId, this.document.id, formData)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: () => {
          this.toastService.success('Document updated successfully.');
          this.updated.emit();
          this.closed.emit();
        },
        error: (error: unknown) => {
          this.toastService.error(this.extractErrorMessage(error, 'Failed to update document.'));
        }
      });
  }

  private patchFormFromDocument(): void {
    const doc = this._document;

    if (!doc) {
      this.form.reset();
      this.selectedFile = null;
      return;
    }

    this.form.patchValue({
      documentNumber: doc.documentNumber ?? '',
      holderName: doc.holderName ?? '',
      issueDate: this.normalizeDateInput(doc.issueDate),
      expiryDate: this.normalizeDateInput(doc.expiryDate),
      issuingOrganization: doc.issuingOrganization ?? ''
    });

    this.selectedFile = null;
  }

  private normalizeDateInput(dateValue: string | undefined): string {
    const value = String(dateValue ?? '').trim();
    if (!value) {
      return '';
    }

    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  private appendIfPresent(formData: FormData, field: string, rawValue: string | null | undefined): void {
    const value = String(rawValue ?? '').trim();
    if (value) {
      formData.append(field, value);
    }
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const httpError = error as { error?: unknown; message?: string };

    if (typeof httpError.error === 'string' && httpError.error.trim()) {
      return httpError.error.trim();
    }

    if (httpError.error && typeof httpError.error === 'object') {
      const payload = httpError.error as Record<string, unknown>;
      const message = String(payload['message'] ?? payload['error'] ?? '').trim();
      if (message) {
        return message;
      }
    }

    if (typeof httpError.message === 'string' && httpError.message.trim()) {
      return httpError.message.trim();
    }

    return fallback;
  }

  private issueDateNotInFutureValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return null;
      }

      const issueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return issueDate > today ? { issueInFuture: true } : null;
    };
  }

  private issueBeforeExpiryValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const issueDateValue = String(control.value ?? '').trim();
      if (!issueDateValue) {
        return null;
      }

      const expiryDateValue = String(control.parent?.get('expiryDate')?.value ?? '').trim();
      if (!expiryDateValue) {
        return null;
      }

      return new Date(issueDateValue) < new Date(expiryDateValue) ? null : { issueAfterExpiry: true };
    };
  }

  private expiryInFutureValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return null;
      }

      const expiryDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return expiryDate > today ? null : { expiryPast: true };
    };
  }

  private expiryAfterIssueValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const expiryDateValue = String(control.value ?? '').trim();
      if (!expiryDateValue) {
        return null;
      }

      const issueDateValue = String(control.parent?.get('issueDate')?.value ?? '').trim();
      if (!issueDateValue) {
        return null;
      }

      return new Date(expiryDateValue) > new Date(issueDateValue) ? null : { expiryBeforeIssue: true };
    };
  }
}
