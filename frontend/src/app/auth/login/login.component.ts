import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loading = false;
  error = '';

  form;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.value.email!, this.form.value.password!).subscribe({
      next: () => {
        if (this.auth.hasRole('SERVICE_PROVIDER', 'PROVIDER', 'VET', 'WALKER')) {
          this.router.navigate(['/admin/services']);
        } else {
          this.router.navigate([this.auth.isAdmin() ? '/admin' : '/app']);
        }
      },
      error: () => { this.error = 'Invalid email or password.'; this.loading = false; }
    });
  }

  onGoogleCredential(credential: string): void {
    this.loading = true;
    this.error = '';
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => {
        if (this.auth.hasRole('SERVICE_PROVIDER', 'PROVIDER', 'VET', 'WALKER')) {
          this.router.navigate(['/admin/services']);
        } else {
          this.router.navigate([this.auth.isAdmin() ? '/admin' : '/app']);
        }
      },
      error: (err) => {
        this.error = err?.error?.error ?? 'Google sign-in failed. Try again or use email and password.';
        this.loading = false;
      }
    });
  }
}
