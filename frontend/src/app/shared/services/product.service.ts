import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PetSpecies } from '../models/pet-profile.model';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  petSpecies?: PetSpecies;
  imageUrl: string;
  active: boolean;
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductReview {
  id: number;
  productId: number;
  userId: number;
  reviewerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CreateProductReviewRequest {
  rating: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = 'http://localhost:8087/elif/product';

  constructor(private http: HttpClient) {}

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.api);
  }

  getActiveProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/active`);
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.api}/${id}`);
  }

  getProductsByCategory(category: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/category/${category}`);
  }

  searchProducts(keyword: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/search`, { params: { keyword } });
  }

  getTrendingProducts(limit = 4): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/trending`, { params: { limit } });
  }

  addProduct(product: FormData): Observable<Product> {
    return this.http.post<Product>(this.api, product);
  }

  updateProduct(id: number, product: FormData): Observable<Product> {
    return this.http.put<Product>(`${this.api}/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }

  getProductReviews(productId: number): Observable<ProductReview[]> {
    return this.http.get<ProductReview[]>(`${this.api}/${productId}/reviews`);
  }

  addProductReview(productId: number, userId: number, review: CreateProductReviewRequest): Observable<ProductReview> {
    return this.http.post<ProductReview>(`${this.api}/${productId}/reviews`, review, { params: { userId } });
  }

  getFavoriteProducts(userId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/favorites`, { params: { userId } });
  }

  addFavoriteProduct(productId: number, userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${productId}/favorite`, null, { params: { userId } });
  }

  removeFavoriteProduct(productId: number, userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${productId}/favorite`, { params: { userId } });
  }
}
