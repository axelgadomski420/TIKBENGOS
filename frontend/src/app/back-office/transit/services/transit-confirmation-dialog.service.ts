import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, take } from 'rxjs';

export type TransitConfirmationTone = 'default' | 'warning' | 'danger';

export interface TransitConfirmationDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: TransitConfirmationTone;
  iconClass?: string;
}

export interface TransitConfirmationDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: TransitConfirmationTone;
  iconClass: string;
}

@Injectable({ providedIn: 'root' })
export class TransitConfirmationDialogService {
  private readonly dialogStateSubject = new BehaviorSubject<TransitConfirmationDialogState | null>(
    null
  );
  private decisionSubject?: Subject<boolean>;

  readonly dialogState$ = this.dialogStateSubject.asObservable();

  confirm(options: TransitConfirmationDialogOptions): Observable<boolean> {
    if (this.decisionSubject) {
      this.decisionSubject.next(false);
      this.decisionSubject.complete();
    }

    this.decisionSubject = new Subject<boolean>();
    this.dialogStateSubject.next({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      tone: options.tone ?? 'default',
      iconClass: options.iconClass ?? this.defaultIcon(options.tone ?? 'default')
    });

    return this.decisionSubject.asObservable().pipe(take(1));
  }

  approve(): void {
    this.resolve(true);
  }

  cancel(): void {
    this.resolve(false);
  }

  private resolve(decision: boolean): void {
    if (this.decisionSubject) {
      this.decisionSubject.next(decision);
      this.decisionSubject.complete();
      this.decisionSubject = undefined;
    }

    this.dialogStateSubject.next(null);
  }

  private defaultIcon(tone: TransitConfirmationTone): string {
    switch (tone) {
      case 'danger':
        return 'fa-trash-can';
      case 'warning':
        return 'fa-triangle-exclamation';
      case 'default':
      default:
        return 'fa-circle-question';
    }
  }
}
