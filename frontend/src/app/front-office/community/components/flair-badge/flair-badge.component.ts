import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-flair-badge',
  templateUrl: './flair-badge.component.html',
  styleUrl: './flair-badge.component.css'
})
export class FlairBadgeComponent {
  @Input() name = '';
  @Input() color = '#3A9282';
  @Input() textColor = '#FFFFFF';
}
