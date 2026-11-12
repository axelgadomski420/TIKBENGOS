import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type EventToastType = 'success' | 'error' | 'warning' | 'info';

export interface EventToast {
  id: number;
  type: EventToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EventToastService {
  private readonly toastsSubject = new BehaviorSubject<EventToast[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();
  private nextId = 1;

  show(type: EventToastType, title: string, message: string, duration = 5000): void {
    const toast: EventToast = {
      id: this.nextId++,
      type,
      title,
      message,
    };

    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    if (duration > 0) {
      window.setTimeout(() => this.remove(toast.id), duration);
    }
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

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(toast => toast.id !== id));
  }
}
