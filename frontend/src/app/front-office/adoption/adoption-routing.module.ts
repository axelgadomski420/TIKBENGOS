import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AdoptionComponent } from './adoption.component';  // ✅ AJOUTER CET IMPORT
import { PetListComponent } from './components/pet-list/pet-list.component';
import { PetDetailComponent } from './components/pet-detail/pet-detail.component';
import { ShelterListComponent } from './components/shelter-list/shelter-list.component';
import { ShelterDetailComponent } from './components/shelter-detail/shelter-detail.component';
import { RequestFormComponent } from './components/request-form/request-form.component';
import { MyRequestsComponent } from './components/my-requests/my-requests.component';
import { MyContractsComponent } from './components/my-contracts/my-contracts.component';
import { ShelterDashboardComponent } from './components/shelter-dashboard/shelter-dashboard.component';
import { ShelterPetsComponent } from './components/shelter-pets/shelter-pets.component';
import { ShelterRequestsComponent } from './components/shelter-requests/shelter-requests.component';
import { ShelterPetFormComponent } from './components/shelter-pet-form/shelter-pet-form.component';
import { PetSuggestionWizardComponent } from './components/pet-suggestion-wizard/pet-suggestion-wizard.component';
import { ShelterAtRiskComponent } from './components/shelter-at-risk/shelter-at-risk.component';
import { AdoptionRedirectGuard } from '../../adoption-redirect.guard';

const routes: Routes = [
  {
    path: '',
    component: AdoptionComponent,  // ✅ LAYOUT PARENT (contient header + chatbot)
    children: [
      { path: '', redirectTo: 'pets', pathMatch: 'full' },

      // ROUTES SHELTER
      { path: 'shelter/pets/new', component: ShelterPetFormComponent },
      { path: 'shelter/pets/edit/:id', component: ShelterPetFormComponent },
      { path: 'shelter/pets', component: ShelterPetsComponent },
      { path: 'shelter/requests', component: ShelterRequestsComponent },
      { path: 'shelter/dashboard', component: ShelterDashboardComponent },
      { path: 'shelter/at-risk', component: ShelterAtRiskComponent },

      // Wizard de suggestion
      { path: 'find-my-pet', component: PetSuggestionWizardComponent },

      // ROUTES UTILISATEUR
      { path: 'pets', component: PetListComponent, canActivate: [AdoptionRedirectGuard] },
      { path: 'pets/:id', component: PetDetailComponent },
      { path: 'pets/:id/adopt', component: RequestFormComponent },
      { path: 'shelters', component: ShelterListComponent },
      { path: 'shelters/:id', component: ShelterDetailComponent },
      { path: 'my-requests', component: MyRequestsComponent },
      { path: 'my-contracts', component: MyContractsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdoptionFrontRoutingModule { }