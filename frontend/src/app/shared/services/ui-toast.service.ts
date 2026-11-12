import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiToastType = 'success' | 'error' | 'warning' | 'info';

export interface UiToast {
  id: number;
  type: UiToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class UiToastService {
  private readonly toastsSubject = new BehaviorSubject<UiToast[]>([]);
  private nextId = 1;

  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string, title = 'Success'): void {
    this.push('success', title, message);
  }

  error(message: string, title = 'Error'): void {
    this.push('error', title, message, 6000);
  }

  warning(message: string, title = 'Warning'): void {
    this.push('warning', title, message, 5000);
  }

  info(message: string, title = 'Info'): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private push(type: UiToastType, title: string, message: string, durationMs = 4500): void {
    const toast: UiToast = {
      id: this.nextId++,
      type,
      title,
      message
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    window.setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
