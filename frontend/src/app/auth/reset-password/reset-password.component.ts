import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  loading = false;
  error = '';
  success = '';
  submitted = false;
  token: string | null = null;
  invalidToken = false;

  form;

  constructor(
    private fb: FormBuilder, 
    private auth: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatch });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.invalidToken = true;
      }
    });
  }

  submit(): void {
    if (this.form.invalid || !this.token) { 
      this.form.markAllAsTouched(); 
      return; 
    }
    
    this.loading = true;
    this.error = '';
    this.success = '';
    
    this.auth.resetPassword(this.token, this.form.value.password!, this.form.value.confirmPassword!).subscribe({
      next: (response) => {
        this.submitted = true;
        this.success = response.message;
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => { 
        this.error = err.error?.message || 'An error occurred while resetting your password.';
        this.loading = false;
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
