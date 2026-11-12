import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProviderGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // 1. Must be logged in
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // 2. The provider-request form is accessible to ANY logged-in user
    //    (the component itself shows the correct state: NONE / PENDING / APPROVED / REJECTED)
    if (state.url.includes('/provider-request')) {
      return true;
    }

    // 3. All other back-office pages require SERVICE_PROVIDER (or ADMIN) role
    if (this.auth.hasRole('SERVICE_PROVIDER', 'PROVIDER', 'VET', 'WALKER', 'ADMIN')) {
      return true;
    }

    // 4. Regular USER trying to access provider-only pages → redirect to provider-request form
    this.router.navigate(['/admin/services/provider-request']);
    return false;
  }
}

