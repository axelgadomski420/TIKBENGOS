import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { EventToast, EventToastService } from '../../services/event-toast.service';

@Component({
  selector: 'app-event-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './event-toast-container.component.html',
  styleUrls: ['./event-toast-container.component.css'],
})
export class EventToastContainerComponent {
  constructor(public readonly toastService: EventToastService) {}

  trackByToastId(_: number, toast: EventToast): number {
    return toast.id;
  }
}
