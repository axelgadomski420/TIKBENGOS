import { Routes } from '@angular/router';
import { PetTransitComponent } from './pet-transit.component';

export const PET_TRANSIT_ROUTES: Routes = [
  {
    path: '',
    component: PetTransitComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'destinations' },
      {
        path: 'destinations',
        loadComponent: () =>
          import('./pages/destination-catalog/destination-catalog.component').then(
            (m) => m.DestinationCatalogComponent
          )
      },
      {
        path: 'destinations/:id',
        loadComponent: () =>
          import('./pages/destination-detail/destination-detail.component').then(
            (m) => m.DestinationDetailComponent
          )
      },
      {
        path: 'plans',
        pathMatch: 'full',
        redirectTo: 'plans/my'
      },
      {
        path: 'plans/my',
        loadComponent: () =>
          import('./pages/travel-plans-list/travel-plans-list.component').then(
            (m) => m.TravelPlansListComponent
          )
      },
      {
        path: 'plans/new',
        loadComponent: () =>
          import('./pages/create-travel-plan/create-travel-plan.component').then(
            (m) => m.CreateTravelPlanComponent
          )
      },
      {
        path: 'plans/:id/edit',
        loadComponent: () =>
          import('./pages/travel-plan-edit/travel-plan-edit.component').then(
            (m) => m.TravelPlanEditComponent
          )
      },
      {
        path: 'plans/:planId/documents',
        loadComponent: () =>
          import('./pages/travel-plan-documents/travel-plan-documents.component').then(
            (m) => m.TravelPlanDocumentsComponent
          )
      },
      {
        path: 'plans/:id/documents',
        loadComponent: () =>
          import('./pages/travel-plan-documents/travel-plan-documents.component').then(
            (m) => m.TravelPlanDocumentsComponent
          )
      },
      {
        path: 'plans/:planId/checklist',
        loadComponent: () =>
          import('./pages/travel-plan-checklist/travel-plan-checklist.component').then(
            (m) => m.TravelPlanChecklistComponent
          )
      },
      {
        path: 'plans/:id/checklist',
        loadComponent: () =>
          import('./pages/travel-plan-checklist/travel-plan-checklist.component').then(
            (m) => m.TravelPlanChecklistComponent
          )
      },
      {
        path: 'plans/:planId/feedback/new',
        loadComponent: () =>
          import('./pages/travel-plan-feedback/travel-plan-feedback.component').then(
            (m) => m.TravelPlanFeedbackComponent
          )
      },
      {
        path: 'feedback/my',
        loadComponent: () =>
          import('./pages/my-feedbacks/my-feedbacks.component').then(
            (m) => m.MyFeedbacksComponent
          )
      },
      {
        path: 'plans/:id/feedback',
        loadComponent: () =>
          import('./pages/travel-plan-detail/travel-plan-detail.component').then(
            (m) => m.TravelPlanDetailComponent
          )
      },
      {
        path: 'plans/:id',
        loadComponent: () =>
          import('./pages/travel-plan-detail/travel-plan-detail.component').then(
            (m) => m.TravelPlanDetailComponent
          )
      }
    ]
  }
];
