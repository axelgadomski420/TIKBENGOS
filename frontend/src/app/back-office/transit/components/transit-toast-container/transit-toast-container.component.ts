import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TransitToastService, TransitToastType } from '../../services/transit-toast.service';

@Component({
  selector: 'app-transit-toast-container',
  templateUrl: './transit-toast-container.component.html',
  styleUrl: './transit-toast-container.component.scss',
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class TransitToastContainerComponent {
  constructor(private readonly transitToastService: TransitToastService) {}

  get toasts$() {
    return this.transitToastService.toasts$;
  }

  dismiss(id: number): void {
    this.transitToastService.dismiss(id);
  }

  toneClass(type: TransitToastType): string {
    switch (type) {
      case 'success':
        return 'toast--success';
      case 'error':
        return 'toast--error';
      case 'info':
      default:
        return 'toast--info';
    }
  }

  iconName(type: TransitToastType): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  }
}
