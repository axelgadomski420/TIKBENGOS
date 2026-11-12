import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './auth/admin.guard';

const routes: Routes = [
  // Front-office principal
  { path: 'app', loadChildren: () => import('./front-office/front-office.module').then(m => m.FrontOfficeModule) },
  
  // Back-office (admin)
  { path: 'admin', loadChildren: () => import('./back-office/back-office.module').then(m => m.BackOfficeModule), canActivate: [AdminGuard] },
  
  // Auth
  { path: 'auth', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) },
  
  // Adoption
  {
    path: 'adoption',
    loadChildren: () => import('./front-office/adoption/adoption.module').then(m => m.AdoptionModule)
  },
  
  // Redirections
  { path: 'community', redirectTo: 'app/community', pathMatch: 'full' },
  { path: 'events', redirectTo: 'app/events', pathMatch: 'full' },  // ✅ AJOUTER
  { path: '', redirectTo: 'app', pathMatch: 'full' },
  { path: '**', redirectTo: 'app' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }