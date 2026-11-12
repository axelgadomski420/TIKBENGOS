import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ButtonComponent } from './button/button.component';
import { CardComponent } from './card/card.component';
import { ConfirmDialogComponent } from './dialogs/confirm-dialog/confirm-dialog.component';
import { MessageDialogComponent } from './dialogs/message-dialog/message-dialog.component';
import { PurreTranslatePipe } from './purre-preferences/purre-translate.pipe';

@NgModule({
  declarations: [
    NavbarComponent,
    SidebarComponent,
    ButtonComponent,
    CardComponent,
    ConfirmDialogComponent,
    MessageDialogComponent,
    PurreTranslatePipe
  ],
  imports: [CommonModule, RouterModule, MatButtonModule, MatDialogModule, MatIconModule],
  exports: [
    NavbarComponent,
    SidebarComponent,
    ButtonComponent,
    CardComponent,
    ConfirmDialogComponent,
    MessageDialogComponent,
    PurreTranslatePipe,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ]
})
export class SharedModule {}
