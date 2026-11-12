import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommunityListComponent } from './components/community-list/community-list.component';
import { CommunityDetailComponent } from './components/community-detail/community-detail.component';
import { CommunityCreateComponent } from './components/community-create/community-create.component';
import { PostDetailComponent } from './components/post-detail/post-detail.component';
import { PostCreateComponent } from './components/post-create/post-create.component';
import { InboxComponent } from './components/inbox/inbox.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { AuthGuard } from '../../auth/auth.guard';

const routes: Routes = [
  { path: '', component: CommunityListComponent },
  { path: 'create', component: CommunityCreateComponent, canActivate: [AuthGuard] },
  { path: 'c/:slug', component: CommunityDetailComponent },
  { path: 'c/:slug/post/new', component: PostCreateComponent, canActivate: [AuthGuard] },
  { path: 'post/:id', component: PostDetailComponent },
  { path: 'inbox', component: InboxComponent, canActivate: [AuthGuard] },
  { path: 'chat/:conversationId', component: ChatWindowComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommunityRoutingModule {}
