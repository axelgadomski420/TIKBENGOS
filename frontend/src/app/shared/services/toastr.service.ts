import { Injectable } from '@angular/core';
import { UiToastService } from './ui-toast.service';

@Injectable({ providedIn: 'root' })
export class ToastrService {
  constructor(private readonly uiToastService: UiToastService) {}

  success(message: string, title = 'Success'): void {
    this.uiToastService.success(message, title);
  }

  error(message: string, title = 'Error'): void {
    this.uiToastService.error(message, title);
  }

  warning(message: string, title = 'Warning'): void {
    this.uiToastService.warning(message, title);
  }

  info(message: string, title = 'Info'): void {
    this.uiToastService.info(message, title);
  }
}
