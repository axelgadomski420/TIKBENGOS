import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  loading = false;
  error = '';

  form;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      // Champs communs
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      accountType: ['USER', Validators.required],
      terms: [false, Validators.requiredTrue],
      
      // Champs pour USER
      firstName: [''],
      lastName: [''],
      
      // Champs pour SHELTER
      organizationName: [''],
      address: [''],
      phone: [''],
      licenseNumber: [''],
      description: [''],
      logoUrl: ['']
    }, { validators: passwordsMatch });
  }

  ngOnInit(): void {
    this.form.get('accountType')?.valueChanges.subscribe(() => {
      this.updateValidators();
    });
    this.updateValidators();
  }

  updateValidators(): void {
    const accountType = this.form.get('accountType')?.value;
    
    if (accountType === 'USER') {
      this.form.get('firstName')?.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.get('lastName')?.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.get('organizationName')?.clearValidators();
      this.form.get('address')?.clearValidators();
    } else {
      this.form.get('organizationName')?.setValidators([Validators.required]);
      this.form.get('address')?.setValidators([Validators.required]);
      this.form.get('firstName')?.clearValidators();
      this.form.get('lastName')?.clearValidators();
    }
    
    this.form.get('firstName')?.updateValueAndValidity();
    this.form.get('lastName')?.updateValueAndValidity();
    this.form.get('organizationName')?.updateValueAndValidity();
    this.form.get('address')?.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) { 
      this.form.markAllAsTouched(); 
      return; 
    }
    
    this.loading = true;
    this.error = '';
    
    const formValues = this.form.value;
    
    if (formValues.accountType === 'SHELTER') {
      this.auth.registerShelter({
        email: formValues.email!,
        password: formValues.password!,
        organizationName: formValues.organizationName || '',
        address: formValues.address || '',
        phone: formValues.phone || '',
        licenseNumber: formValues.licenseNumber || '',
        description: formValues.description || '',
        logoUrl: formValues.logoUrl || ''
      }).subscribe({
        next: () => {
          alert('Your shelter registration has been submitted. Please wait for admin approval.');
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Registration failed. Please try again.';
          this.loading = false;
        }
      });
    } else {
      this.auth.register(
        formValues.firstName || '', 
        formValues.lastName || '', 
        formValues.email!, 
        formValues.password!, 
        formValues.accountType!
      ).subscribe({
        next: (user) => {
          this.router.navigate(['/app']);
        },
        error: (err) => {
          this.error = err?.error?.error ?? 'Registration failed. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  onGoogleCredential(credential: string): void {
    this.loading = true;
    this.error = '';
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => this.router.navigate(['/app']),
      error: (err) => {
        this.error = err?.error?.error ?? 'Google sign-up failed. Try again or register with email.';
        this.loading = false;
      }
    });
  }
}