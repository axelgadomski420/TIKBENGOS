import { Component } from '@angular/core';
import { UiToast, UiToastService } from '../services/ui-toast.service';

@Component({
  selector: 'app-ui-toast',
  templateUrl: './ui-toast.component.html',
  styleUrls: ['./ui-toast.component.css']
})
export class UiToastComponent {
  constructor(public readonly uiToastService: UiToastService) {}

  dismiss(id: number): void {
    this.uiToastService.dismiss(id);
  }

  toneClass(type: UiToast['type']): string {
    if (type === 'success') return 'ui-toast--success';
    if (type === 'error') return 'ui-toast--error';
    if (type === 'warning') return 'ui-toast--warning';
    return 'ui-toast--info';
  }
}
