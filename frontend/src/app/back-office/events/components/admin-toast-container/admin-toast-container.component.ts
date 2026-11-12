import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { AdminToastService } from '../../services/admin-toast.service';

@Component({
  selector: 'app-admin-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './admin-toast-container.component.html',
  styleUrls: ['./admin-toast-container.component.css']
})
export class AdminToastContainerComponent {
  constructor(public readonly toastService: AdminToastService) {}

  trackByToastId(_: number, toast: { id: number }): number {
    return toast.id;
  }
}
