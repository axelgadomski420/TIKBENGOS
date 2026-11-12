import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfirmDialogService, ConfirmDialogState } from '../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-choice-card',
  templateUrl: './confirm-choice-card.component.html',
  styleUrl: './confirm-choice-card.component.css'
})
export class ConfirmChoiceCardComponent {
  constructor(private readonly confirmDialogService: ConfirmDialogService) {}

  get dialogState$(): Observable<ConfirmDialogState | null> {
    return this.confirmDialogService.dialogState$;
  }

  close(): void {
    this.confirmDialogService.cancel();
  }

  confirm(): void {
    this.confirmDialogService.approve();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
