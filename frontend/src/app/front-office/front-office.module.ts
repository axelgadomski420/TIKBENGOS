import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FrontOfficeRoutingModule } from './front-office-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { LandingComponent } from './landing/landing.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    LayoutComponent,
    LandingComponent
  ],
  imports: [
    CommonModule,
    FrontOfficeRoutingModule,
    SharedModule
  ]
})
export class FrontOfficeModule { }
