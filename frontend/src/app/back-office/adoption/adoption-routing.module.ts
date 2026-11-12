import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { ShelterManagementComponent } from './components/shelter-management/shelter-management.component';
import { PetManagementComponent } from './components/pet-management/pet-management.component';
import { RequestManagementComponent } from './components/request-management/request-management.component';
import { ContractManagementComponent } from './components/contract-management/contract-management.component';
import { ReviewModerationComponent } from './components/review-moderation/review-moderation.component';
import { PetFormComponent } from './components/pet-form/pet-form.component';
import { ShelterDetailComponent } from './components/shelter-detail/shelter-detail.component';
import { AdminAtRiskComponent } from './components/admin-at-risk/admin-at-risk.component'; // ✅ AJOUTER

const routes: Routes = [
  // Page d'accueil = dashboard (statistiques)
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StatisticsComponent },
  { path: 'shelters', component: ShelterManagementComponent },
  { path: 'pets', component: PetManagementComponent },
  { path: 'pets/create', component: PetFormComponent },
  { path: 'pets/edit/:id', component: PetFormComponent },
  { path: 'requests', component: RequestManagementComponent },
  { path: 'contracts', component: ContractManagementComponent },
  { path: 'shelters/:id', component: ShelterDetailComponent },
  { path: 'reviews', component: ReviewModerationComponent },
  { path: 'at-risk', component: AdminAtRiskComponent } // ✅ AJOUTER
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdoptionBackRoutingModule { }