import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';

import { CommunitySharedModule } from './community-shared.module';
import { CommunityListComponent } from './components/community-list/community-list.component';
import { CommunityDetailComponent } from './components/community-detail/community-detail.component';
import { DetailLeftRailComponent } from './components/community-detail/detail-left-rail/detail-left-rail.component';
import { DetailFeedComponent } from './components/community-detail/detail-feed/detail-feed.component';
import { DetailRightRailComponent } from './components/community-detail/detail-right-rail/detail-right-rail.component';
import { CommunityCreateComponent } from './components/community-create/community-create.component';
import { PostDetailComponent } from './components/post-detail/post-detail.component';
import { PostCreateComponent } from './components/post-create/post-create.component';
import { InboxComponent } from './components/inbox/inbox.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { GifPickerDialogComponent } from './components/gif-picker-dialog/gif-picker-dialog.component';

@NgModule({
  declarations: [
    CommunityListComponent,
    CommunityDetailComponent,
    DetailLeftRailComponent,
    DetailFeedComponent,
    DetailRightRailComponent,
    CommunityCreateComponent,
    PostDetailComponent,
    PostCreateComponent,
    InboxComponent,
    ChatWindowComponent,
    GifPickerDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    CommunitySharedModule
  ]
})
export class CommunityPagesModule {}
