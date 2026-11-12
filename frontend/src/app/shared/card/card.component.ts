import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() image?: string;
  @Input() badge?: string;
  @Input() customClasses: string = '';
}
