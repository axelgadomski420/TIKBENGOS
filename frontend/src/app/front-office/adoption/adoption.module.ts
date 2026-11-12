import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdoptionFrontRoutingModule } from './adoption-routing.module';

// Composants
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
import { AdoptionComponent } from './adoption.component';
import { PetSuggestionWizardComponent } from './components/pet-suggestion-wizard/pet-suggestion-wizard.component';
import { ToastNotificationComponent } from './components/toast-notification/toast-notification.component';  // ✅ AJOUTÉ
import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component';
// Services
import { ContractService } from './services/contract.service';
import { AppointmentService } from './services/appointment.service';
import { ShelterAtRiskComponent } from './components/shelter-at-risk/shelter-at-risk.component';

@NgModule({
  declarations: [
    PetListComponent,
    PetDetailComponent,
    ShelterListComponent,
    ShelterDetailComponent,
    RequestFormComponent,
    MyRequestsComponent,
    MyContractsComponent,
    ShelterDashboardComponent,
    ShelterPetsComponent,
    ShelterRequestsComponent,
    ShelterPetFormComponent,
    AdoptionComponent,
    PetSuggestionWizardComponent,
    ToastNotificationComponent,
    ChatbotWidgetComponent,
    ShelterAtRiskComponent  
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AdoptionFrontRoutingModule
  ],
  exports: [
    ToastNotificationComponent  // ✅ AJOUTER POUR UTILISER DANS APP COMPONENT
  ],
  providers: [
    ContractService,
    AppointmentService
  ]
})
export class AdoptionModule { }