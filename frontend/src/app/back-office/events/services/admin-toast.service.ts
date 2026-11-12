import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  private counter = 0;

  show(type: ToastMessage['type'], title: string, message: string, duration = 5000): void {
    const id = ++this.counter;
    const nextToast: ToastMessage = { id, type, title, message, duration };
    this.toastsSubject.next([...this.toastsSubject.value, nextToast]);

    if (duration > 0) {
      window.setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(toast => toast.id !== id));
  }

  success(title: string, message: string, duration?: number): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message: string, duration?: number): void {
    this.show('error', title, message, duration);
  }

  warning(title: string, message: string, duration?: number): void {
    this.show('warning', title, message, duration);
  }

  info(title: string, message: string, duration?: number): void {
    this.show('info', title, message, duration);
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}
