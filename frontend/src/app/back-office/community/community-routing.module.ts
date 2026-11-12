import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommunityComponent } from './community.component';
import { ChatModerationComponent } from './chat-moderation/chat-moderation.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: 'overview', component: CommunityComponent, data: { mode: 'overview' } },
  { path: 'communities', component: CommunityComponent, data: { mode: 'communities' } },
  { path: 'content', component: CommunityComponent, data: { mode: 'content' } },
  { path: 'chat-moderation', component: ChatModerationComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommunityRoutingModule {}
