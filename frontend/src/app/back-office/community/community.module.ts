import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { CommunityComponent } from './community.component';
import { CommunityRoutingModule } from './community-routing.module';
import { ChatModerationComponent } from './chat-moderation/chat-moderation.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CreateCommunityDialogComponent } from './create-community-dialog.component';
import { CreatePostDialogComponent } from './create-post-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@NgModule({
  declarations: [CommunityComponent, ChatModerationComponent, CreateCommunityDialogComponent, CreatePostDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    CommunityRoutingModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    PaginationComponent,
    ReactiveFormsModule
  ]
})
export class CommunityModule {}
