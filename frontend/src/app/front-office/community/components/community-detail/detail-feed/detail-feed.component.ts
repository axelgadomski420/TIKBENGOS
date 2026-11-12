import { Component, Input } from '@angular/core';
import { CommunityDetailComponent } from '../community-detail.component';

@Component({
  selector: 'app-community-detail-feed',
  templateUrl: './detail-feed.component.html',
  styleUrl: './detail-feed.component.css'
})
export class DetailFeedComponent {
  @Input({ required: true }) host!: CommunityDetailComponent;
}
