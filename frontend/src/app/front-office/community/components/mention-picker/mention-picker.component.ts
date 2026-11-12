import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MentionCandidate } from '../../services/mention-helper.service';

@Component({
  selector: 'app-mention-picker',
  templateUrl: './mention-picker.component.html',
  styleUrl: './mention-picker.component.css'
})
export class MentionPickerComponent {
  @Input() open = false;
  @Input() suggestions: MentionCandidate[] = [];
  @Input() activeIndex = 0;
  @Input() label = 'Mention someone';

  @Output() selectMention = new EventEmitter<MentionCandidate>();

  choose(candidate: MentionCandidate): void {
    this.selectMention.emit(candidate);
  }
}
