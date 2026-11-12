import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from './product.service';
import { HttpClient } from '@angular/common/http';
import { AuthService, SessionUser } from '../../auth/auth.service';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export interface Order {
  id: number;
  userId: number;
  status: string;
  paymentMethod: 'CASH' | 'ONLINE';
  totalAmount: number;
  discountAmount?: number;
  appliedPromoCode?: string;
  createdAt: string;
  orderItems: OrderItem[];
  awardedPromoCodes?: string[];
  promoMessage?: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly CART_STORAGE_KEY = 'elif_cart';
  private readonly api = 'http://localhost:8087/elif/order';
  private readonly paymentApi = 'http://localhost:8087/elif/payment';

  private activeStorageKey = this.getCartStorageKey(this.authService.getCurrentUser());
  private cart = new BehaviorSubject<CartItem[]>(this.loadCart(this.activeStorageKey));
  public cart$ = this.cart.asObservable();

  private total = new BehaviorSubject<number>(this.calculateTotal(this.cart.value));
  public total$ = this.total.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.authService.userChanges$.subscribe(user => {
      this.syncCartForUser(user);
    });
  }

  addToCart(product: Product, quantity: number = 1): void {
    this.ensureCurrentUserCart();
    const currentCart = this.cart.value;
    const existingItem = currentCart.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      currentCart.push({ product, quantity });
    }

    this.saveCart(currentCart);
    this.updateTotal();
  }

  removeFromCart(productId: number): void {
    this.ensureCurrentUserCart();
    const currentCart = this.cart.value.filter(item => item.product.id !== productId);
    this.saveCart(currentCart);
    this.updateTotal();
  }

  updateQuantity(productId: number, quantity: number): void {
    this.ensureCurrentUserCart();
    const currentCart = this.cart.value;
    const item = currentCart.find(item => item.product.id === productId);

    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = quantity;
        this.saveCart(currentCart);
        this.updateTotal();
      }
    }
  }

  getCart(): CartItem[] {
    this.ensureCurrentUserCart();
    return this.cart.value;
  }

  getCartCount(): Observable<number> {
    return this.cart$.pipe(
      map(items => items.reduce((count, item) => count + item.quantity, 0))
    );
  }

  getTotal(): number {
    this.ensureCurrentUserCart();
    return this.total.value;
  }

  clearCart(): void {
    this.ensureCurrentUserCart();
    this.saveCart([]);
    this.updateTotal();
  }

  checkout(userId: number, paymentMethod: 'CASH' | 'ONLINE', promoCode?: string): Observable<Order> {
    this.ensureCurrentUserCart();
    const items = this.getCheckoutItems();

    return new Observable(observer => {
      this.http.post<Order>(`${this.api}/create`, { userId, items, paymentMethod, promoCode })
        .subscribe({
          next: (order) => {
            this.clearCart();
            observer.next(order);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
    });
  }

  createStripeCheckoutSession(
    userId: number,
    successUrl: string,
    cancelUrl: string,
    promoCode?: string
  ): Observable<StripeCheckoutResponse> {
    this.ensureCurrentUserCart();
    const items = this.getCheckoutItems();

    return this.http.post<StripeCheckoutResponse>(
      `${this.paymentApi}/stripe/checkout-session`,
      { userId, items, successUrl, cancelUrl, promoCode }
    );
  }

  confirmStripeCheckoutOrder(
    userId: number,
    sessionId: string,
    checkoutItems?: CheckoutItem[],
    promoCode?: string
  ): Observable<Order> {
    this.ensureCurrentUserCart();
    const items = checkoutItems && checkoutItems.length > 0
      ? checkoutItems
      : this.getCheckoutItems();

    return new Observable(observer => {
      this.http.post<Order>(`${this.paymentApi}/stripe/confirm-order`, { userId, sessionId, items, promoCode })
        .subscribe({
          next: (order) => {
            this.clearCart();
            observer.next(order);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
    });
  }

  getUserOrders(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/user/${userId}`);
  }

  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.api);
  }

  confirmOrder(orderId: number): Observable<Order> {
    return this.http.put<Order>(`${this.api}/${orderId}/confirm`, {});
  }

  updateOrderStatus(
    orderId: number,
    status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  ): Observable<Order> {
    return this.http.put<Order>(`${this.api}/${orderId}/status`, { status });
  }

  downloadInvoice(orderId: number): Observable<Blob> {
    return this.http.get(`${this.api}/${orderId}/invoice`, { responseType: 'blob' });
  }

  private ensureCurrentUserCart(): void {
    const storageKey = this.getCartStorageKey(this.authService.getCurrentUser());

    if (storageKey === this.activeStorageKey) {
      return;
    }

    this.syncCartForUser(this.authService.getCurrentUser());
  }

  private syncCartForUser(user: SessionUser | null): void {
    const storageKey = this.getCartStorageKey(user);

    if (storageKey === this.activeStorageKey) {
      return;
    }

    this.activeStorageKey = storageKey;
    const nextCart = this.loadCart(storageKey);
    this.cart.next(nextCart);
    this.total.next(this.calculateTotal(nextCart));
  }

  private getCartStorageKey(user: SessionUser | null): string {
    return user?.id ? `${this.CART_STORAGE_KEY}_${user.id}` : `${this.CART_STORAGE_KEY}_guest`;
  }

  private loadCart(storageKey: string): CartItem[] {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveCart(cart: CartItem[]): void {
    localStorage.setItem(this.activeStorageKey, JSON.stringify(cart));
    this.cart.next(cart);
  }

  private getCheckoutItems(): CheckoutItem[] {
    return this.cart.value.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));
  }

  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }

  private updateTotal(): void {
    this.total.next(this.calculateTotal(this.cart.value));
  }
}
