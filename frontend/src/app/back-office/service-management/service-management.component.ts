import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-back-office-service-management',
  templateUrl: './service-management.component.html',
  styleUrl: './service-management.component.css'
})
export class ServiceManagementComponent {
  isAdminRoute = false;

  constructor(private router: Router, private auth: AuthService) {
    this.router.events.subscribe(() => {
      this.isAdminRoute = this.auth.isAdmin();
    });
  }
}
