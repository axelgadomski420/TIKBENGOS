import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { DialogData, DialogType } from '../dialogs/dialog-data.model';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component';
import { MessageDialogComponent } from '../dialogs/message-dialog/message-dialog.component';

@Injectable({ providedIn: 'root' })
export class DialogService {
  constructor(private readonly dialog: MatDialog) {}

  openSuccess(title: string, message: string): void {
    this.openMessageDialog({ type: 'success', title, message });
  }

  openError(title: string, message: string): void {
    this.openMessageDialog({ type: 'error', title, message });
  }

  openWarning(title: string, message: string): void {
    this.openMessageDialog({ type: 'warning', title, message });
  }

  openInfo(title: string, message: string): void {
    this.openMessageDialog({ type: 'info', title, message });
  }

  openConfirm(title: string, message: string): Observable<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, this.buildConfig({
      type: 'warning',
      title,
      message
    }, true));

    return ref.afterClosed().pipe(map((result) => result === true));
  }

  private openMessageDialog(data: DialogData): void {
    this.dialog.open(MessageDialogComponent, this.buildConfig(data, false));
  }

  private buildConfig(data: DialogData, disableClose: boolean): MatDialogConfig<DialogData> {
    return {
      data,
      panelClass: 'animated-dialog',
      autoFocus: false,
      restoreFocus: false,
      disableClose,
      width: 'min(92vw, 480px)',
      maxWidth: '92vw'
    };
  }
}