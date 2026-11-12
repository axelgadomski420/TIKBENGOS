import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateDestinationComponent } from './pages/create-destination/create-destination.component';
import { DestinationDetailsComponent } from './pages/destination-details/destination-details.component';
import { DestinationsListComponent } from './pages/destinations-list/destinations-list.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    loadComponent: () =>
      import('./pages/transit-overview/transit-overview.component').then(
        (m) => m.TransitOverviewComponent
      )
  },
  { path: 'destinations', component: DestinationsListComponent },
  { path: 'destinations/create', component: CreateDestinationComponent },
  { path: 'destinations/:id/edit', component: CreateDestinationComponent },
  { path: 'destinations/:id', component: DestinationDetailsComponent },
  {
    path: 'travel-plans',
    loadComponent: () =>
      import('./pages/travel-plans-admin/travel-plans-admin.component').then(
        (m) => m.TravelPlansAdminComponent
      )
  },
  {
    path: 'travel-plans/:id',
    loadComponent: () =>
      import('./pages/travel-plan-admin-detail/travel-plan-admin-detail.component').then(
        (m) => m.TravelPlanAdminDetailComponent
      )
  },
  {
    path: 'feedback',
    loadComponent: () =>
      import('./pages/feedback-admin/feedback-admin.component').then(
        (m) => m.FeedbackAdminComponent
      )
  },
  { path: '**', redirectTo: 'overview' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TransitRoutingModule {}
