import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product, ProductService } from '../../../shared/services/product.service';
import { AuthService } from '../../../auth/auth.service';
import { CartService } from '../../../shared/services/cart.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-marketplace-favorites',
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent implements OnInit {
  favorites: Product[] = [];
  loading = false;
  error = '';
  actionLoadingIds = new Set<number>();

  constructor(
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly cartService: CartService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly dialogService: DialogService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.error = 'Please login to see your favorite products.';
      this.favorites = [];
      return;
    }

    this.loading = true;
    this.error = '';
    this.productService.getFavoriteProducts(userId).subscribe({
      next: (favorites) => {
        this.favorites = favorites ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading favorite products:', err);
        this.error = '';
        this.toastr.error(err?.error?.error || 'Unable to load favorite products right now.', 'Favorites load failed');
        this.loading = false;
      }
    });
  }

  removeFavorite(productId: number, event?: Event): void {
    event?.stopPropagation();
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.error = 'Please login to manage favorite products.';
      return;
    }

    if (this.actionLoadingIds.has(productId)) {
      return;
    }

    this.actionLoadingIds.add(productId);
    this.productService.removeFavoriteProduct(productId, userId).subscribe({
      next: () => {
        this.favorites = this.favorites.filter((item) => item.id !== productId);
        this.actionLoadingIds.delete(productId);
      },
      error: (err) => {
        console.error('Error removing favorite product:', err);
        this.error = err?.error?.error || 'Unable to remove favorite right now.';
        this.toastr.error(this.error, 'Favorite removal failed');
        this.actionLoadingIds.delete(productId);
      }
    });
  }

  addToCart(product: Product, event?: Event): void {
    event?.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (product.stock <= 0) {
      this.dialogService.openWarning('Out of stock', 'This product is out of stock.');
      return;
    }

    this.cartService.addToCart(product, 1);
    this.toastr.success(`${product.name} added to cart!`, 'Added to cart');
  }

  openProduct(productId: number): void {
    this.router.navigate(['../products', productId], { relativeTo: this.route });
  }

  goToProducts(): void {
    this.router.navigate(['../products'], { relativeTo: this.route });
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
