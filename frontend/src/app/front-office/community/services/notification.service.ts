import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messagesSource = new Subject<string>();
  messages$ = this.messagesSource.asObservable();

  push(message: string): void {
    this.messagesSource.next(message);
  }
}
