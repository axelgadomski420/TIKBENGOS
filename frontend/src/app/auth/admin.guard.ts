import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: import('@angular/router').ActivatedRouteSnapshot, state: import('@angular/router').RouterStateSnapshot): boolean {
    if (this.auth.isAdmin()) return true;

    // Allow service providers to access the /admin/services route
    if (state.url.startsWith('/admin/services') && this.auth.hasRole('SERVICE_PROVIDER', 'PROVIDER', 'VET', 'WALKER')) {
      return true;
    }

    // Allow ANY logged-in user to access the provider request application form
    if (state.url.includes('/admin/services/provider-request')) {
      if (this.auth.isLoggedIn()) return true;
    }

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/app']);
      return false;
    }

    this.router.navigate(['/auth/login']);
    return false;
  }
}
