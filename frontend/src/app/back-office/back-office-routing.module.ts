import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

import { ProviderGuard } from '../auth/provider.guard';

const routes: Routes = [
  { path: 'services', loadChildren: () => import('./service-management/service-management.module').then(m => m.ServiceManagementModule), canActivate: [ProviderGuard] },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', loadChildren: () => import('./users/users.module').then(m => m.UsersModule) },
      { path: 'community', loadChildren: () => import('./community/community.module').then(m => m.CommunityModule) },
      { path: 'pets', loadChildren: () => import('./pets/pets.module').then(m => m.PetsModule) },
      { path: 'transit', loadChildren: () => import('./transit/transit.module').then(m => m.TransitModule) },
      { path: 'adoption', loadChildren: () => import('./adoption/adoption.module').then(m => m.AdoptionModule) },
      { path: 'events', loadChildren: () => import('./events/events.module').then(m => m.EventsModule) },
      { path: 'marketplace', loadChildren: () => import('./marketplace/marketplace.module').then(m => m.MarketplaceModule) },
      { path: 'orders', redirectTo: 'marketplace/orders', pathMatch: 'full' },
      { path: '**', redirectTo: 'users' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackOfficeRoutingModule {}