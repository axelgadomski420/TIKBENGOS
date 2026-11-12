import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { CartService, Order, OrderItem } from '../../../shared/services/cart.service';
import {
  MarketplaceReclamation,
  MarketplaceReclamationForm,
  MarketplaceReclamationService,
  MarketplaceReclamationType
} from '../../../shared/services/marketplace-reclamation.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-marketplace-reclamation-create',
  templateUrl: './reclamation-create.component.html',
  styleUrl: './reclamation-create.component.css'
})
export class ReclamationCreateComponent implements OnInit {
  loading = false;
  submitting = false;
  currentUserId: number | null = null;
  editingId: number | null = null;

  orders: Order[] = [];
  shippedOrders: Order[] = [];

  reclamationForm: MarketplaceReclamationForm = this.buildEmptyForm();
  selectedImageName = 'Aucun fichier choisi';
  imagePreview: string | null = null;

  formError = '';
  loadError = '';

  readonly maxImageSizeBytes = 5 * 1024 * 1024;

  readonly reclamationTypes: MarketplaceReclamationType[] = [
    'DELIVERY',
    'DAMAGED_PRODUCT',
    'WRONG_ITEM',
    'PAYMENT',
    'REFUND',
    'OTHER'
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly reclamationService: MarketplaceReclamationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialogService: DialogService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id ?? null;

    if (!this.currentUserId) {
      this.loadError = 'Please login to submit marketplace reclamations.';
      this.dialogService.openWarning('Login required', this.loadError);
      return;
    }

    this.reclamationForm = this.buildEmptyForm();
    this.reclamationForm.userId = this.currentUserId;

    this.editingId = this.toNumber(this.route.snapshot.paramMap.get('id'));

    if (this.editingId) {
      this.loadOrders(() => this.loadReclamationForEdit(this.editingId as number));
      return;
    }

    this.loadOrders();
  }

  loadOrders(afterLoad?: () => void): void {
    if (!this.currentUserId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.cartService.getUserOrders(this.currentUserId).subscribe({
      next: (orders) => {
        this.orders = [...orders].sort((a, b) => this.toTime(b.createdAt) - this.toTime(a.createdAt));
        this.shippedOrders = this.orders.filter((order) => order.status === 'SHIPPED');
        this.loading = false;
        if (afterLoad) {
          afterLoad();
        }
      },
      error: (err) => {
        this.loadError = err?.error?.error || 'Failed to load your orders';
        this.toastr.error(this.loadError, 'Orders load failed');
        this.loading = false;
      }
    });
  }

  loadReclamationForEdit(id: number): void {
    this.loading = true;
    this.loadError = '';

    this.reclamationService.getById(id).subscribe({
      next: (reclamation: MarketplaceReclamation) => {
        if (!this.currentUserId || reclamation.userId !== this.currentUserId) {
          this.loadError = 'You can only edit your own reclamations.';
          this.dialogService.openWarning('Access denied', this.loadError);
          this.loading = false;
          return;
        }

        this.reclamationForm = {
          id: reclamation.id,
          userId: reclamation.userId,
          orderId: reclamation.orderId,
          productId: reclamation.productId,
          title: reclamation.title,
          description: reclamation.description,
          type: reclamation.type,
          image: reclamation.image ?? null,
          imageFile: null
        };
        this.selectedImageName = reclamation.image ? 'Existing image' : 'Aucun fichier choisi';
        this.imagePreview = reclamation.image ? this.reclamationService.getImageUrl(reclamation.id) : null;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.error || 'Failed to load reclamation';
        this.toastr.error(this.loadError, 'Reclamation load failed');
        this.loading = false;
      }
    });
  }

  onOrderSelected(orderIdValue: string | number | null): void {
    const parsed = typeof orderIdValue === 'number' ? orderIdValue : Number(orderIdValue);
    const nextOrderId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    if (nextOrderId && !this.isShippedOrder(nextOrderId)) {
      this.showFormError('You can submit a reclamation only for shipped orders.');
      this.reclamationForm.orderId = null;
      this.reclamationForm.productId = null;
      return;
    }

    this.reclamationForm.orderId = nextOrderId;
    this.reclamationForm.productId = null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.clearSelectedImage();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showFormError('Please select an image file only.');
      input.value = '';
      this.clearSelectedImage();
      return;
    }

    if (file.size > this.maxImageSizeBytes) {
      this.showFormError('Image must be 5MB or less.');
      input.value = '';
      this.clearSelectedImage();
      return;
    }

    this.formError = '';
    this.reclamationForm.imageFile = file;
    this.selectedImageName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  submitReclamation(): void {
    if (!this.currentUserId) {
      this.showFormError('Please login first.');
      return;
    }

    if (!this.reclamationForm.orderId) {
      this.showFormError('Please select a purchase order.');
      return;
    }

    if (!this.isShippedOrder(this.reclamationForm.orderId)) {
      this.showFormError('You can submit a reclamation only for shipped orders.');
      return;
    }

    if (!this.reclamationForm.title.trim()) {
      this.showFormError('Please enter a title.');
      return;
    }

    if (!this.reclamationForm.description.trim()) {
      this.showFormError('Please enter a detailed description.');
      return;
    }

    if (this.reclamationForm.imageFile) {
      if (!this.reclamationForm.imageFile.type.startsWith('image/')) {
        this.showFormError('Please select an image file only.');
        return;
      }

      if (this.reclamationForm.imageFile.size > this.maxImageSizeBytes) {
        this.showFormError('Image must be 5MB or less.');
        return;
      }
    }

    const payload: MarketplaceReclamationForm = {
      ...this.reclamationForm,
      userId: this.currentUserId,
      orderId: this.reclamationForm.orderId,
      productId: this.reclamationForm.productId ?? null,
      title: this.reclamationForm.title.trim(),
      description: this.reclamationForm.description.trim(),
      type: this.reclamationForm.type,
      image: this.reclamationForm.image ?? null,
      imageFile: this.reclamationForm.imageFile ?? null
    };

    this.formError = '';
    this.submitting = true;

    const request$ = this.editingId
      ? this.reclamationService.updateReclamation(this.editingId, payload)
      : this.reclamationService.createReclamation(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/app/marketplace/reclamations']);
      },
      error: (err) => {
        this.formError = err?.error?.error || 'Failed to submit reclamation';
        this.toastr.error(this.formError, 'Reclamation submit failed');
        this.submitting = false;
      }
    });
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
  }

  goBack(): void {
    this.router.navigate(['/app/marketplace/reclamations']);
  }

  get productsForSelectedOrder(): OrderItem[] {
    if (!this.reclamationForm.orderId) {
      return [];
    }

    const selectedOrder = this.orders.find((order) => order.id === this.reclamationForm.orderId);
    return selectedOrder?.orderItems ?? [];
  }

  get submitLabel(): string {
    return this.editingId ? 'Update reclamation' : 'Submit reclamation';
  }

  get hasImagePreview(): boolean {
    return Boolean(this.imagePreview);
  }

  clearSelectedImage(): void {
    this.reclamationForm.imageFile = null;
    this.selectedImageName = 'Aucun fichier choisi';
    this.imagePreview = this.reclamationForm.id && this.reclamationForm.image
      ? this.reclamationService.getImageUrl(this.reclamationForm.id)
      : null;
  }

  private showFormError(message: string): void {
    this.formError = message;
    this.dialogService.openWarning('Form validation', message);
  }

  private buildEmptyForm(): MarketplaceReclamationForm {
    return {
      userId: this.currentUserId,
      orderId: null,
      productId: null,
      title: '',
      description: '',
      type: 'OTHER',
      image: null,
      imageFile: null
    };
  }

  private toNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private toTime(value: string): number {
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isShippedOrder(orderId: number): boolean {
    const selectedOrder = this.orders.find((order) => order.id === orderId);
    return selectedOrder?.status === 'SHIPPED';
  }
}
