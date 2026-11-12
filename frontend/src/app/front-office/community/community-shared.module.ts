import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PostCardComponent } from './components/post-card/post-card.component';
import { CommentTreeComponent } from './components/comment-tree/comment-tree.component';
import { VoteButtonsComponent } from './components/vote-buttons/vote-buttons.component';
import { FlairBadgeComponent } from './components/flair-badge/flair-badge.component';
import { MentionPickerComponent } from './components/mention-picker/mention-picker.component';
import { MentionHighlightPipe } from './pipes/mention-highlight.pipe';

@NgModule({
  declarations: [
    PostCardComponent,
    CommentTreeComponent,
    VoteButtonsComponent,
    FlairBadgeComponent,
    MentionPickerComponent,
    MentionHighlightPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [
    PostCardComponent,
    CommentTreeComponent,
    VoteButtonsComponent,
    FlairBadgeComponent,
    MentionPickerComponent,
    MentionHighlightPipe
  ]
})
export class CommunitySharedModule {}
