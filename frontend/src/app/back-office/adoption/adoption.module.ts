import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdoptionBackRoutingModule } from './adoption-routing.module';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { ShelterManagementComponent } from './components/shelter-management/shelter-management.component';
import { PetManagementComponent } from './components/pet-management/pet-management.component';
import { RequestManagementComponent } from './components/request-management/request-management.component';
import { ContractManagementComponent } from './components/contract-management/contract-management.component';
import { ReviewModerationComponent } from './components/review-moderation/review-moderation.component';
import { PetFormComponent } from './components/pet-form/pet-form.component';
import { ShelterDetailComponent } from './components/shelter-detail/shelter-detail.component';
import { AdminAtRiskComponent } from './components/admin-at-risk/admin-at-risk.component';

@NgModule({
  declarations: [
    StatisticsComponent,
    ShelterManagementComponent,
    PetManagementComponent,
    RequestManagementComponent,
    ContractManagementComponent,
    ReviewModerationComponent,
    PetFormComponent,
    ShelterDetailComponent,
    AdminAtRiskComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AdoptionBackRoutingModule
  ]
})
export class AdoptionModule { }  // ✅ Renommé en AdoptionModule