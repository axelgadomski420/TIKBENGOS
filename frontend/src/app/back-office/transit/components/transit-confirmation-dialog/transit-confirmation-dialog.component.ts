import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Observable } from 'rxjs';
import {
  TransitConfirmationDialogService,
  TransitConfirmationDialogState
} from '../../services/transit-confirmation-dialog.service';

@Component({
  selector: 'app-transit-confirmation-dialog',
  templateUrl: './transit-confirmation-dialog.component.html',
  styleUrl: './transit-confirmation-dialog.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class TransitConfirmationDialogComponent {
  constructor(
    private readonly transitConfirmationDialogService: TransitConfirmationDialogService
  ) {}

  get dialogState$(): Observable<TransitConfirmationDialogState | null> {
    return this.transitConfirmationDialogService.dialogState$;
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.cancel();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.cancel();
  }

  cancel(): void {
    this.transitConfirmationDialogService.cancel();
  }

  confirm(): void {
    this.transitConfirmationDialogService.approve();
  }
}
