import { Component, OnInit } from '@angular/core';
import { CartService, CartItem, CheckoutItem, Order } from '../../../shared/services/cart.service';
import { AuthService, SessionUser } from '../../../auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {
  cart: CartItem[] = [];
  total = 0;
  loading = false;
  currentUser: SessionUser | null = null;
  promoCodeInput = '';
  readonly freeShippingThreshold = 100;
  readonly standardShippingFee = 6.99;
  selectedPaymentMethod: 'CASH' | 'ONLINE' = 'CASH';
  private readonly pendingStripeItemsKey = 'elif_stripe_pending_items';
  private readonly pendingStripePromoCodeKey = 'elif_stripe_pending_promo_code';

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
    });

    this.cartService.total$.subscribe(total => {
      this.total = total;
    });

    this.currentUser = this.authService.getCurrentUser();
    this.promoCodeInput = this.getPendingStripePromoCode() ?? this.promoCodeInput;

    this.route.queryParamMap.subscribe(params => {
      const stripeState = params.get('stripe');
      const sessionId = params.get('session_id');

      if (stripeState === 'success' && sessionId) {
        this.finalizeStripeCheckout(sessionId);
      }

      if (stripeState === 'cancel') {
        const pendingPromoCode = this.getPendingStripePromoCode();
        if (pendingPromoCode) {
          this.promoCodeInput = pendingPromoCode;
        }

        this.dialogService.openInfo('Checkout cancelled', 'Stripe checkout was cancelled. Your cart is still available.');
        this.clearPendingStripeItems();
        this.clearPendingStripePromoCode();
        this.clearStripeQueryParams();
      }
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity < 1) return;
    this.cartService.updateQuantity(productId, quantity);
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  get itemCount(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  get taxAmount(): number {
    return this.total * 0.1;
  }

  get shippingFee(): number {
    return this.total >= this.freeShippingThreshold || this.total === 0 ? 0 : this.standardShippingFee;
  }

  get amountForFreeShipping(): number {
    if (this.total >= this.freeShippingThreshold) {
      return 0;
    }
    return this.freeShippingThreshold - this.total;
  }

  get freeShippingProgress(): number {
    return Math.min((this.total / this.freeShippingThreshold) * 100, 100);
  }

  get grandTotal(): number {
    return this.total + this.taxAmount + this.shippingFee;
  }

  clearCart(): void {
    this.dialogService.openConfirm('Clear cart', 'Are you sure you want to clear your cart?').subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.cartService.clearCart();
      this.clearPendingStripeItems();
      this.clearPendingStripePromoCode();
    });
  }

  /**
   * Proceed with checkout
   */
  checkout(): void {
    if (!this.currentUser) {
      this.dialogService.openWarning('Login required', 'Please login to proceed with checkout.');
      return;
    }

    if (this.cart.length === 0) {
      this.dialogService.openWarning('Cart empty', 'Your cart is empty.');
      return;
    }

    if (this.selectedPaymentMethod === 'ONLINE') {
      this.startStripeCheckout();
      return;
    }

    this.processCashCheckout();
  }

  /**
   * Navigate back to marketplace
   */
  continueShopping(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private processCashCheckout(): void {
    if (!this.currentUser) {
      return;
    }

    this.clearPendingStripeItems();
    this.clearPendingStripePromoCode();
    this.loading = true;
    this.cartService.checkout(this.currentUser.id, 'CASH', this.normalizePromoCode(this.promoCodeInput) ?? undefined).subscribe({
      next: (order: Order) => {
        this.loading = false;
        this.downloadInvoice(order);
        this.toastr.success(this.buildOrderSuccessMessage(order, 'Order placed successfully!'), 'Order placed successfully');
        this.continueShopping();
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.error || 'Unknown error', 'Order failed');
      }
    });
  }

  private startStripeCheckout(): void {
    if (!this.currentUser) {
      return;
    }

    const checkoutItems = this.getCheckoutItems();
    const promoCode = this.normalizePromoCode(this.promoCodeInput);
    if (checkoutItems.length === 0) {
      this.dialogService.openWarning('Cart empty', 'Your cart is empty.');
      return;
    }

    this.storePendingStripeItems(checkoutItems);
    this.storePendingStripePromoCode(promoCode);

    const origin = window.location.origin;
    const successUrl = `${origin}/app/marketplace/cart?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/app/marketplace/cart?stripe=cancel`;

    this.loading = true;
    this.cartService.createStripeCheckoutSession(this.currentUser.id, successUrl, cancelUrl, promoCode ?? undefined).subscribe({
      next: (response) => {
        window.location.href = response.checkoutUrl;
      },
      error: (err) => {
        this.loading = false;
        this.clearPendingStripeItems();
        this.clearPendingStripePromoCode();
        this.toastr.error(err.error?.error || 'Unable to start Stripe checkout', 'Stripe checkout error');
      }
    });
  }

  private finalizeStripeCheckout(sessionId: string): void {
    if (!this.currentUser) {
      this.clearStripeQueryParams();
      return;
    }

    const checkoutItems = this.getPendingStripeItems();
    if (checkoutItems.length === 0) {
      this.dialogService.openWarning('Restore checkout failed', 'Unable to restore checkout cart. Please try checkout again.');
      this.clearStripeQueryParams();
      return;
    }

    const promoCode = this.getPendingStripePromoCode() ?? this.normalizePromoCode(this.promoCodeInput);

    const completionKey = `elif_stripe_checkout_completed_${sessionId}`;
    if (sessionStorage.getItem(completionKey)) {
      this.clearPendingStripeItems();
      this.clearPendingStripePromoCode();
      this.clearStripeQueryParams();
      return;
    }

    this.loading = true;
    this.cartService.confirmStripeCheckoutOrder(this.currentUser.id, sessionId, checkoutItems, promoCode ?? undefined).subscribe({
      next: (order: Order) => {
        sessionStorage.setItem(completionKey, '1');
        this.loading = false;
        this.clearPendingStripeItems();
        this.clearPendingStripePromoCode();
        this.downloadInvoice(order);
        this.toastr.success(this.buildOrderSuccessMessage(order, 'Stripe payment successful.'), 'Stripe payment successful');
        this.clearStripeQueryParams();
        this.continueShopping();
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err.error?.error || 'Unknown error', 'Stripe payment failed');
        this.clearStripeQueryParams();
      }
    });
  }

  private getCheckoutItems(): CheckoutItem[] {
    return this.cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
  }

  private storePendingStripeItems(items: CheckoutItem[]): void {
    sessionStorage.setItem(this.pendingStripeItemsKey, JSON.stringify(items));
  }

  private clearPendingStripeItems(): void {
    sessionStorage.removeItem(this.pendingStripeItemsKey);
  }

  private storePendingStripePromoCode(promoCode: string | null): void {
    if (!promoCode) {
      sessionStorage.removeItem(this.pendingStripePromoCodeKey);
      return;
    }

    sessionStorage.setItem(this.pendingStripePromoCodeKey, promoCode);
  }

  private getPendingStripePromoCode(): string | null {
    return this.normalizePromoCode(sessionStorage.getItem(this.pendingStripePromoCodeKey));
  }

  private clearPendingStripePromoCode(): void {
    sessionStorage.removeItem(this.pendingStripePromoCodeKey);
  }

  private getPendingStripeItems(): CheckoutItem[] {
    const storedItems = sessionStorage.getItem(this.pendingStripeItemsKey);
    if (!storedItems) {
      return this.getCheckoutItems();
    }

    try {
      const parsed = JSON.parse(storedItems);
      if (!Array.isArray(parsed)) {
        return this.getCheckoutItems();
      }

      return parsed
        .map((item: any) => ({
          productId: Number(item?.productId),
          quantity: Number(item?.quantity)
        }))
        .filter((item: CheckoutItem) => Number.isFinite(item.productId) && Number.isFinite(item.quantity) && item.quantity > 0);
    } catch {
      return this.getCheckoutItems();
    }
  }

  private clearStripeQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  private downloadInvoice(order: Order): void {
    this.cartService.downloadInvoice(order.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `elif-invoice-${order.id}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download invoice PDF', err);
      }
    });
  }

  private buildOrderSuccessMessage(order: Order, prefix: string): string {
    const base = `${prefix} Order ID: ${order.id}`;
    const promoCodes = order.awardedPromoCodes ?? [];
    const appliedPromoLine = order.appliedPromoCode
      ? `\nApplied promo: ${order.appliedPromoCode}${order.discountAmount ? ` (-$${order.discountAmount.toFixed(2)})` : ''}`
      : '';

    if (promoCodes.length === 0) {
      return `${base}${appliedPromoLine}`;
    }

    const promoLabel = promoCodes.length === 1 ? 'promo code' : 'promo codes';
    const promoMessage = order.promoMessage
      ? `\n${order.promoMessage}`
      : `\nYou unlocked ${promoCodes.length} ${promoLabel} after crossing another $200 purchase milestone. Check your email for details.`;

    return `${base}${appliedPromoLine}${promoMessage}\n${promoCodes.join(', ')}`;
  }

  private normalizePromoCode(value: string | null | undefined): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    return value.trim().toUpperCase();
  }
}
