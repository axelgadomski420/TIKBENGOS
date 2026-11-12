import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { Observable } from 'rxjs';
import {
  UserDeleteDialogService,
  UserDeleteDialogState
} from '../../services/user-delete-dialog.service';

@Component({
  selector: 'app-user-delete-dialog',
  templateUrl: './user-delete-dialog.component.html',
  styleUrl: './user-delete-dialog.component.scss',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDeleteDialogComponent {
  constructor(private readonly userDeleteDialogService: UserDeleteDialogService) {}

  get dialogState$(): Observable<UserDeleteDialogState | null> {
    return this.userDeleteDialogService.dialogState$;
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.cancel();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.cancel();
  }

  cancel(): void {
    this.userDeleteDialogService.cancel();
  }

  confirm(): void {
    this.userDeleteDialogService.approve();
  }
}
