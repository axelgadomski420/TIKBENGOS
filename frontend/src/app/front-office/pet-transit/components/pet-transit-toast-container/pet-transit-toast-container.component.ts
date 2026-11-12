import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PetTransitToastService, PetTransitToastType } from '../../services/pet-transit-toast.service';

@Component({
  selector: 'app-pet-transit-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './pet-transit-toast-container.component.html',
  styleUrl: './pet-transit-toast-container.component.scss'
})
export class PetTransitToastContainerComponent {
  constructor(private readonly toastService: PetTransitToastService) {}

  get toasts$() {
    return this.toastService.toasts$;
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  toneClass(type: PetTransitToastType): string {
    if (type === 'success') {
      return 'toast-success';
    }

    if (type === 'warning') {
      return 'toast-warning';
    }

    return 'toast-error';
  }

  icon(type: PetTransitToastType): string {
    if (type === 'success') {
      return 'check_circle';
    }

    if (type === 'warning') {
      return 'warning_amber';
    }

    return 'error_outline';
  }
}
