import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, take } from 'rxjs';
import { AdminUser } from '../../services/admin-user.service';

export interface UserDeleteDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  iconClass: string;
  userName: string;
  userEmail: string;
}

@Injectable({ providedIn: 'root' })
export class UserDeleteDialogService {
  private readonly dialogStateSubject = new BehaviorSubject<UserDeleteDialogState | null>(null);
  private decisionSubject?: Subject<boolean>;

  readonly dialogState$ = this.dialogStateSubject.asObservable();

  confirm(user: AdminUser): Observable<boolean> {
    if (this.decisionSubject) {
      this.decisionSubject.next(false);
      this.decisionSubject.complete();
    }

    this.decisionSubject = new Subject<boolean>();
    this.dialogStateSubject.next({
      title: 'Delete user account',
      message: 'Are you sure you want to delete this user?',
      confirmLabel: 'Confirm Delete',
      cancelLabel: 'Cancel',
      iconClass: 'fa-trash-can',
      userName: this.resolveDisplayName(user),
      userEmail: user.email
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

  private resolveDisplayName(user: AdminUser): string {
    const composed = `${user.firstName} ${user.lastName}`.trim();
    return composed.length > 0 ? composed : user.email;
  }
}
