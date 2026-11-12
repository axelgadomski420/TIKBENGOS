import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TransitToastType = 'success' | 'error' | 'info';

export interface TransitToast {
  id: number;
  type: TransitToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TransitToastService {
  private readonly toastsSubject = new BehaviorSubject<TransitToast[]>([]);
  private nextId = 1;

  readonly toasts$ = this.toastsSubject.asObservable();

  success(title: string, message: string, timeoutMs = 3200): void {
    this.push('success', title, message, timeoutMs);
  }

  error(title: string, message: string, timeoutMs = 4200): void {
    this.push('error', title, message, timeoutMs);
  }

  info(title: string, message: string, timeoutMs = 3000): void {
    this.push('info', title, message, timeoutMs);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private push(
    type: TransitToastType,
    title: string,
    message: string,
    timeoutMs: number
  ): void {
    const toast: TransitToast = {
      id: this.nextId++,
      type,
      title,
      message
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    window.setTimeout(() => {
      this.dismiss(toast.id);
    }, timeoutMs);
  }
}

