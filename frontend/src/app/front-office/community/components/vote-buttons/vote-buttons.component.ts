import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-vote-buttons',
  templateUrl: './vote-buttons.component.html',
  styleUrl: './vote-buttons.component.css'
})
export class VoteButtonsComponent {
  @Input() score = 0;
  @Input() userVote: 1 | -1 | null = null;
  @Output() voted = new EventEmitter<1 | -1>();

  get upvoteAriaLabel(): string {
    return this.userVote === 1 ? 'Remove upvote' : 'Upvote';
  }

  get downvoteAriaLabel(): string {
    return this.userVote === -1 ? 'Remove downvote' : 'Downvote';
  }

  get scoreLabel(): string {
    if (this.score > 0) {
      return `+${this.score}`;
    }

    return String(this.score);
  }

  vote(value: 1 | -1): void {
    this.voted.emit(value);
  }
}
