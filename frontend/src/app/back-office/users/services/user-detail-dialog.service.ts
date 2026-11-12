import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdminUser } from '../../services/admin-user.service';

export interface UserDetailDialogState {
  user: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class UserDetailDialogService {
  private readonly dialogStateSubject = new BehaviorSubject<UserDetailDialogState | null>(null);

  readonly dialogState$ = this.dialogStateSubject.asObservable();

  open(user: AdminUser): void {
    this.dialogStateSubject.next({
      user: { ...user }
    });
  }

  close(): void {
    this.dialogStateSubject.next(null);
  }

  isOpen(): boolean {
    return this.dialogStateSubject.value !== null;
  }
}
