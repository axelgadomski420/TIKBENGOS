import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfirmChoiceCardComponent } from './shared/confirm-choice-card/confirm-choice-card.component';
import { UiToastComponent } from './shared/ui-toast/ui-toast.component';
import { PurrePreferencesComponent } from './shared/purre-preferences/purre-preferences.component';

@NgModule({
  declarations: [
    AppComponent,
    ConfirmChoiceCardComponent,
    UiToastComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatDialogModule,
    AppRoutingModule,
    PurrePreferencesComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
