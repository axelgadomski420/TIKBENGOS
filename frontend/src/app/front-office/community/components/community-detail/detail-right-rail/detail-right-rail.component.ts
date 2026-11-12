import { Component, Input } from '@angular/core';
import { CommunityDetailComponent } from '../community-detail.component';

@Component({
  selector: 'app-community-detail-right-rail',
  templateUrl: './detail-right-rail.component.html',
  styleUrl: './detail-right-rail.component.css'
})
export class DetailRightRailComponent {
  @Input({ required: true }) host!: CommunityDetailComponent;
}
