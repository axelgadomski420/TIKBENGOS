import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { UsersComponent } from './users.component';
import { UsersRoutingModule } from './users-routing.module';
import { UserDeleteDialogComponent } from './components/user-delete-dialog/user-delete-dialog.component';
import { UserDetailDialogComponent } from './components/user-detail-dialog/user-detail-dialog.component';

@NgModule({
  declarations: [UsersComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    UsersRoutingModule,
    UserDeleteDialogComponent,
    UserDetailDialogComponent
  ]
})
export class UsersModule {}
