import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Product,
  ProductReview,
  ProductService
} from '../../../shared/services/product.service';
import { CartService } from '../../../shared/services/cart.service';
import { AuthService } from '../../../auth/auth.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {
  // Dog-only rating scale.
  private readonly ratingFaces = ['🐶', '🐕', '🐕‍🦺', '🦮', '🐩'];

  product: Product | null = null;
  quantity = 1;
  loading = false;
  isLoggedIn = false;
  cartMessage = '';
  showCartMessage = false;
  isFavorite = false;
  favoriteLoading = false;
  reviews: ProductReview[] = [];
  loadingReviews = false;
  submittingReview = false;
  reviewForm = {
    rating: 5,
    comment: ''
  };
  hoveredRating = 0;

  get currentUserReview(): ProductReview | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      return null;
    }

    return this.reviews.find((review) => review.userId === userId) ?? null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private dialogService: DialogService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(Number(productId));
    }
  }

  /**
   * Load product details
   */
  private loadProduct(id: number): void {
    this.loading = true;
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.loadFavoriteState();
        this.loadReviews(id);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading product:', err);
        this.loading = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      }
    });
  }

  private loadReviews(productId: number): void {
    this.loadingReviews = true;
    this.productService.getProductReviews(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews ?? [];
        this.loadingReviews = false;
      },
      error: (err) => {
        console.error('Error loading product reviews:', err);
        this.reviews = [];
        this.loadingReviews = false;
      }
    });
  }

  submitReview(): void {
    if (!this.product) {
      return;
    }

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.dialogService.openWarning('Login required', 'Please login to leave a review.');
      this.router.navigate(['/auth/login']);
      return;
    }

    const rating = Number(this.reviewForm.rating);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      this.dialogService.openWarning('Invalid rating', 'Rating must be between 1 and 5.');
      return;
    }

    this.submittingReview = true;
    this.productService.addProductReview(this.product.id, userId, {
      rating,
      comment: this.reviewForm.comment?.trim() || undefined
    }).subscribe({
      next: (createdReview) => {
        this.reviews = [createdReview, ...this.reviews];
        this.reviewForm.comment = '';
        this.reviewForm.rating = 5;
        this.submittingReview = false;

        if (this.product) {
          const currentCount = this.product.reviewCount ?? 0;
          const currentAvg = this.product.averageRating ?? 0;
          const nextCount = currentCount + 1;
          const nextAvg = ((currentAvg * currentCount) + rating) / nextCount;
          this.product.reviewCount = nextCount;
          this.product.averageRating = Math.round(nextAvg * 10) / 10;
        }
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        this.submittingReview = false;
        this.toastr.error(err?.error?.error || 'Unable to submit review right now.', 'Review failed');
      }
    });
  }

  private loadFavoriteState(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId || !this.product) {
      this.isFavorite = false;
      return;
    }

    this.productService.getFavoriteProducts(userId).subscribe({
      next: (favorites) => {
        const favoriteIds = new Set((favorites ?? []).map((product) => product.id));
        this.isFavorite = favoriteIds.has(this.product!.id);
      },
      error: () => {
        this.isFavorite = false;
      }
    });
  }

  toggleFavorite(): void {
    if (!this.product) {
      return;
    }

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      this.dialogService.openWarning('Login required', 'Please login to manage favorite products.');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.favoriteLoading) {
      return;
    }

    this.favoriteLoading = true;
    const request = this.isFavorite
      ? this.productService.removeFavoriteProduct(this.product.id, userId)
      : this.productService.addFavoriteProduct(this.product.id, userId);

    request.subscribe({
      next: () => {
        this.isFavorite = !this.isFavorite;
        this.favoriteLoading = false;
      },
      error: (err) => {
        console.error('Error updating favorite product:', err);
        this.favoriteLoading = false;
        this.toastr.error(err?.error?.error || 'Unable to update favorite products right now.', 'Favorite update failed');
      }
    });
  }

  reviewStarIndexes(): number[] {
    return [1, 2, 3, 4, 5];
  }

  reviewFaceArray(rating: number): string[] {
    const safe = Math.max(1, Math.min(5, Math.round(rating)));
    return this.ratingFaces.slice(0, safe);
  }

  getRatingFace(position: number): string {
    return this.ratingFaces[Math.max(0, Math.min(position - 1, this.ratingFaces.length - 1))];
  }

  setRating(rating: number): void {
    this.reviewForm.rating = rating;
  }

  previewRating(rating: number): void {
    this.hoveredRating = rating;
  }

  clearPreviewRating(): void {
    this.hoveredRating = 0;
  }

  isInteractiveStarFilled(star: number): boolean {
    const activeRating = this.hoveredRating || this.reviewForm.rating;
    return star <= activeRating;
  }

  /**
   * Add product to cart with specified quantity
   */
  addToCart(): void {
    if (!this.isLoggedIn) {
      this.dialogService.openWarning('Login required', 'Please login to add items to cart.');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.product) {
      return;
    }

    if (this.quantity < 1 || this.quantity > this.product.stock) {
      this.dialogService.openWarning('Invalid quantity', 'Invalid quantity.');
      return;
    }

    // Add multiple quantities to cart
    for (let i = 0; i < this.quantity; i++) {
      this.cartService.addToCart(this.product);
    }

    // Show success message
    this.cartMessage = `✓ Added ${this.quantity} ${this.quantity === 1 ? 'item' : 'items'} to cart!`;
    this.showCartMessage = true;

    // Hide message after 3 seconds
    setTimeout(() => {
      this.showCartMessage = false;
    }, 3000);

    // Reset quantity
    this.quantity = 1;
  }

  /**
   * Increase quantity
   */
  increaseQuantity(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  /**
   * Decrease quantity
   */
  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  onQuantityInput(value: number | string): void {
    if (!this.product) {
      this.quantity = 1;
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      this.quantity = 1;
      return;
    }

    const normalized = Math.floor(parsed);
    this.quantity = Math.min(Math.max(normalized, 1), Math.max(this.product.stock, 1));
  }

  /**
   * Go back to product list
   */
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  /**
   * Navigate to cart
   */
  viewCart(): void {
    this.router.navigate(['../../cart'], { relativeTo: this.route });
  }
}
