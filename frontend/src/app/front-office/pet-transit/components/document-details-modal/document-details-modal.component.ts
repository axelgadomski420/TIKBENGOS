import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { DOCUMENT_CONFIG, VALIDATION_STATUS_CONFIG } from '../../models/travel-document.model';
import { TravelDocumentResponse } from '../../services/travel-document.service';

@Component({
  selector: 'app-document-details-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './document-details-modal.component.html',
  styleUrl: './document-details-modal.component.scss'
})
export class DocumentDetailsModalComponent {
  private readonly baseUrl = 'http://localhost:8087/elif';

  @Input() document!: TravelDocumentResponse;
  @Output() closed = new EventEmitter<void>();

  constructor(private readonly sanitizer: DomSanitizer) {}

  closeModal(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  get documentTypeLabel(): string {
    return DOCUMENT_CONFIG[this.document.documentType]?.label ?? this.document.documentType;
  }

  get documentTypeIcon(): string {
    return DOCUMENT_CONFIG[this.document.documentType]?.icon ?? 'description';
  }

  get statusLabel(): string {
    return VALIDATION_STATUS_CONFIG[this.document.validationStatus]?.label ?? 'Pending Review';
  }

  get statusClass(): string {
    return VALIDATION_STATUS_CONFIG[this.document.validationStatus]?.colorClass ?? 'status-pending';
  }

  get fullFileUrl(): string {
    const fileUrl = this.document?.fileUrl;
    if (!fileUrl) {
      return '';
    }

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }

    const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  get pdfPreviewUrl(): SafeResourceUrl | null {
    if (!this.fullFileUrl || !this.isPdf(this.fullFileUrl)) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fullFileUrl);
  }

  getFileName(fileUrl: string): string {
    if (!fileUrl) {
      return 'Unknown file';
    }

    const sanitized = fileUrl.split('?')[0] ?? '';
    return sanitized.split('/').pop() || 'file';
  }

  getFileExtension(fileUrl: string): string {
    const sanitized = fileUrl.split('?')[0] ?? '';
    return sanitized.split('.').pop()?.toLowerCase() || '';
  }

  isImage(fileUrl: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(this.getFileExtension(fileUrl));
  }

  isPdf(fileUrl: string): boolean {
    return this.getFileExtension(fileUrl) === 'pdf';
  }

  canPreview(fileUrl: string): boolean {
    return this.isImage(fileUrl) || this.isPdf(fileUrl);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) {
      return '—';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  valueOrDash(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return normalized || '—';
  }
}
