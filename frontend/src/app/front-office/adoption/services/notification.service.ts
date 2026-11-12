import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationSubject = new Subject<Notification[]>();
  private idCounter = 0;

  notifications$ = this.notificationSubject.asObservable();

  showSuccess(title: string, message: string, duration: number = 5000): void {
    this.show({ type: 'success', title, message, duration });
  }

  showError(title: string, message: string, duration: number = 6000): void {
    this.show({ type: 'error', title, message, duration });
  }

  showWarning(title: string, message: string, duration: number = 5000): void {
    this.show({ type: 'warning', title, message, duration });
  }

  showInfo(title: string, message: string, duration: number = 4000): void {
    this.show({ type: 'info', title, message, duration });
  }

  private show(notification: Omit<Notification, 'id'>): void {
    const id = this.idCounter++;
    const newNotification = { ...notification, id };
    
    this.notifications = [...this.notifications, newNotification];
    this.notificationSubject.next(this.notifications);

    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }
  }

  remove(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationSubject.next(this.notifications);
  }

  clear(): void {
    this.notifications = [];
    this.notificationSubject.next(this.notifications);
  }
}