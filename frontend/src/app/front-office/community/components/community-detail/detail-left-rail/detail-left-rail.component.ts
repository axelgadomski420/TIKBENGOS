import { Component, Input } from '@angular/core';
import { CommunityDetailComponent } from '../community-detail.component';

@Component({
  selector: 'app-community-detail-left-rail',
  templateUrl: './detail-left-rail.component.html',
  styleUrl: './detail-left-rail.component.css'
})
export class DetailLeftRailComponent {
  @Input({ required: true }) host!: CommunityDetailComponent;
}
