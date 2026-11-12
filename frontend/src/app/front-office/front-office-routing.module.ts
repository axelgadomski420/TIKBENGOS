import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LandingComponent } from './landing/landing.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: LandingComponent },
      { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'pets', loadChildren: () => import('./pet-profiles/pet-profiles.module').then(m => m.PetProfilesModule) },
      { path: 'transit', loadChildren: () => import('./pet-transit/pet-transit.module').then(m => m.PetTransitModule) },
      { path: 'services', loadChildren: () => import('./services/services.module').then(m => m.ServicesModule) },
      { path: 'adoption', loadChildren: () => import('./adoption/adoption.module').then(m => m.AdoptionModule) },
      { path: 'events', loadChildren: () => import('./events/events.module').then(m => m.EventsModule) },
      { path: 'marketplace', loadChildren: () => import('./marketplace/marketplace.module').then(m => m.MarketplaceModule) },
      { path: 'community', loadChildren: () => import('./community/community.module').then(m => m.CommunityModule) }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FrontOfficeRoutingModule {}
