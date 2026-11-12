import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export type ConfirmDialogTone = 'danger' | 'neutral';

export interface ConfirmDialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmDialogTone;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: ConfirmDialogTone;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly stateSubject = new BehaviorSubject<ConfirmDialogState | null>(null);
  private pendingResponse: Subject<boolean> | null = null;

  readonly dialogState$ = this.stateSubject.asObservable();

  confirmDelete(entityLabel = 'item', message?: string): Observable<boolean> {
    return this.confirm(message ?? `Delete this ${entityLabel}? This action cannot be undone.`, {
      title: 'Confirm deletion',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger'
    });
  }

  confirm(message: string, options: ConfirmDialogOptions = {}): Observable<boolean> {
    this.cancelPending(false);

    const response = new Subject<boolean>();
    this.pendingResponse = response;
    this.stateSubject.next({
      title: options.title ?? 'Please confirm',
      message: options.message ?? message,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      tone: options.tone ?? 'neutral'
    });

    return response.asObservable();
  }

  approve(): void {
    this.resolvePending(true);
  }

  cancel(): void {
    this.resolvePending(false);
  }

  private resolvePending(result: boolean): void {
    if (this.pendingResponse) {
      this.pendingResponse.next(result);
      this.pendingResponse.complete();
    }
    this.pendingResponse = null;
    this.stateSubject.next(null);
  }

  private cancelPending(result: boolean): void {
    if (!this.pendingResponse) {
      return;
    }
    this.pendingResponse.next(result);
    this.pendingResponse.complete();
    this.pendingResponse = null;
  }
}
