import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type PetTransitToastType = 'success' | 'error' | 'warning';

export interface PetTransitToast {
  id: number;
  type: PetTransitToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PetTransitToastService {
  private readonly toastsSubject = new BehaviorSubject<PetTransitToast[]>([]);
  private nextId = 1;

  readonly toasts$ = this.toastsSubject.asObservable();

  success(message: string): void {
    this.push('success', message);
  }

  showSuccess(message: string): void {
    this.success(message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  warning(message: string): void {
    this.push('warning', message);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private push(type: PetTransitToastType, message: string): void {
    const toast: PetTransitToast = {
      id: this.nextId++,
      type,
      message
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    window.setTimeout(() => {
      this.dismiss(toast.id);
    }, 3000);
  }
}
