import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { CommunityRoutingModule } from './community-routing.module';
import { CommunityPagesModule } from './community-pages.module';

@NgModule({
  imports: [
    HttpClientModule,
    CommunityRoutingModule,
    CommunityPagesModule
  ]
})
export class CommunityModule {}
