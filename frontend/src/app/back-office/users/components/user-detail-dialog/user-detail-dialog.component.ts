import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminUser } from '../../../services/admin-user.service';
import {
  UserDetailDialogService,
  UserDetailDialogState
} from '../../services/user-detail-dialog.service';

@Component({
  selector: 'app-user-detail-dialog',
  templateUrl: './user-detail-dialog.component.html',
  styleUrl: './user-detail-dialog.component.scss',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDetailDialogComponent {
  private readonly joinedDateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium'
  });

  constructor(private readonly userDetailDialogService: UserDetailDialogService) {}

  get dialogState$(): Observable<UserDetailDialogState | null> {
    return this.userDetailDialogService.dialogState$;
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.close();
  }

  close(): void {
    this.userDetailDialogService.close();
  }

  fullName(user: AdminUser): string {
    const composed = `${user.firstName} ${user.lastName}`.trim();
    return composed.length > 0 ? composed : user.email;
  }

  isAdminRole(role: string): boolean {
    return String(role ?? '').trim().toUpperCase() === 'ADMIN';
  }

  formatJoinedDate(value?: string): string {
    if (!value) {
      return 'Not available';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return this.joinedDateFormatter.format(parsed);
  }
}
