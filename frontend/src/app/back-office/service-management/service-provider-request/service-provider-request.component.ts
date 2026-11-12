import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import {
  ServiceProviderRequestService,
  ServiceProviderRequest
} from '../../services/service-provider-request.service';

@Component({
  selector: 'app-service-provider-request',
  templateUrl: './service-provider-request.component.html',
  styleUrls: ['./service-provider-request.component.css']
})
export class ServiceProviderRequestComponent implements OnInit {

  form!: FormGroup;
  request: ServiceProviderRequest | null = null;
  loading = true;
  submitting = false;
  errorMsg = '';
  successMsg = '';
  selectedCv: File | null = null;
  userEmail: string = '';
  userFullName: string = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private requestService: ServiceProviderRequestService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userEmail = user?.email || '';
    this.userFullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    this.form = this.fb.group({
      fullName: [{ value: this.userFullName, disabled: true }, Validators.required],
      email: [{ value: this.userEmail, disabled: true }, [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^\\+?[0-9\\s]{8,15}$')]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
    this.loadMyRequest();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        this.selectedCv = file;
        this.errorMsg = '';
      } else {
        this.errorMsg = 'Veuillez sélectionner un fichier PDF valide pour votre CV.';
        this.selectedCv = null;
      }
    }
  }

  private loadMyRequest(): void {
    const user = this.auth.getCurrentUser();
    if (!user) { this.loading = false; return; }

    this.requestService.getMyRequest(user.id).subscribe({
      next: (req) => {
        // Backend retourne { status: 'NONE' } si aucune demande
        if ((req as any).status === 'NONE') {
          this.request = null;
        } else {
          this.request = req;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get currentStatus(): string {
    return this.request?.status ?? 'NONE';
  }

  get isPending(): boolean  { return this.currentStatus === 'PENDING'; }
  get isApproved(): boolean { return this.currentStatus === 'APPROVED'; }
  get isRejected(): boolean { return this.currentStatus === 'REJECTED'; }
  get hasNoRequest(): boolean { return this.currentStatus === 'NONE'; }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.submitting = true;
    this.errorMsg = '';
    this.successMsg = '';

    const phone = this.form.get('phone')?.value;
    const desc = this.form.get('message')?.value;

    this.requestService.createRequest(
      user.id,
      this.userFullName,
      this.userEmail,
      phone,
      desc,
      this.selectedCv
    ).subscribe({
      next: (req) => {
        this.request = req;
        this.submitting = false;
        this.successMsg = 'Votre demande a été envoyée avec succès !';
        this.form.reset({
          fullName: this.userFullName,
          email: this.userEmail,
          phone: '',
          message: ''
        });
        this.selectedCv = null;
      },
      error: (err) => {
        this.submitting = false;
        this.errorMsg = err?.error?.message || 'Une erreur est survenue. Réessayez.';
      }
    });
  }
}
