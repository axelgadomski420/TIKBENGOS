import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  loading = false;
  error = '';
  success = '';
  submitted = false;

  form;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  submit(): void {
    if (this.form.invalid) { 
      this.form.markAllAsTouched(); 
      return; 
    }
    
    this.loading = true;
    this.error = '';
    this.success = '';
    
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next: (response) => {
        this.submitted = true;
        this.success = response.message;
        this.loading = false;
        this.form.reset();
      },
      error: (err) => { 
        // For security, still show the same message
        this.submitted = true;
        this.success = 'If this email exists in our system, a password reset link has been sent.';
        this.loading = false;
        this.form.reset();
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
