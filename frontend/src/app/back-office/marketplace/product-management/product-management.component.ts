import { Component, OnInit } from '@angular/core';
import { ProductService, Product } from '../../../shared/services/product.service';
import { AuthService } from '../../../auth/auth.service';
import { PetSpecies } from '../../../shared/models/pet-profile.model';
import { DialogService } from '../../../shared/services/dialog.service';
import { ToastrService } from '../../../shared/services/toastr.service';

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit {
  products: Product[] = [];
  loading = false;
  showAddForm = false;
  editingId: number | null = null;
  searchTerm = '';
  filterCategory = 'ALL';
  filterStatus = 'ALL';
  filterPetSpecies = 'ALL';
  selectedImageFile: File | null = null;
  selectedImagePreview: string | null = null;
  currentImageUrl: string | null = null;
  hasCurrentSavedImage = false;

  categories = ['Food & Feed', 'Health Essentials', 'Accessories', 'Merchandise'];
  petSpeciesOptions: PetSpecies[] = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'FISH', 'REPTILE', 'OTHER'];

  isAdmin = false;

  newProduct: Partial<Product> = {
    name: '',
    description: '',
    category: 'Food & Feed',
    price: 0,
    stock: 0,
    petSpecies: 'OTHER',
    active: true
  };

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private dialogService: DialogService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    if (!this.isAdmin) {
      this.dialogService.openWarning('Access denied', 'You need admin privileges to access this page.');
      console.warn('User is not admin - access denied');
      return;
    }
    this.loadProducts();
  }

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.products.filter((product) => {
      const matchesSearch = !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description || '').toLowerCase().includes(term) ||
        (product.category || '').toLowerCase().includes(term);

      const matchesCategory = this.filterCategory === 'ALL' || product.category === this.filterCategory;

      const productStatus = product.active ? 'ACTIVE' : 'INACTIVE';
      const matchesStatus = this.filterStatus === 'ALL' || productStatus === this.filterStatus;

      const productPet = product.petSpecies || 'OTHER';
      const matchesPetSpecies = this.filterPetSpecies === 'ALL' || productPet === this.filterPetSpecies;

      return matchesSearch && matchesCategory && matchesStatus && matchesPetSpecies;
    });
  }

  get activeProductsCount(): number {
    return this.products.filter((product) => product.active).length;
  }

  get inactiveProductsCount(): number {
    return this.products.filter((product) => !product.active).length;
  }

  get lowStockCount(): number {
    return this.products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim().length > 0
      || this.filterCategory !== 'ALL'
      || this.filterStatus !== 'ALL'
      || this.filterPetSpecies !== 'ALL';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterCategory = 'ALL';
    this.filterStatus = 'ALL';
    this.filterPetSpecies = 'ALL';
  }

  toggleAddForm(): void {
    if (this.showAddForm) {
      this.resetForm();
      return;
    }

    // Always start Add mode from a clean state to avoid stale auto-generation keys.
    this.resetForm();
    this.showAddForm = true;
    this.autoFillDescription();
  }

  /**
   * Load all products from the backend
   */
  loadProducts(): void {
    this.loading = true;
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Add a new product
   */
  addProduct(): void {
    if (!this.validateProductForm()) {
      this.dialogService.openWarning('Validation required', 'Please fill in all required fields correctly.');
      return;
    }

    const payload = this.buildFormData();

    this.productService.addProduct(payload).subscribe({
      next: (newProduct) => {
        this.toastr.success('Product added successfully!', 'Product added');
        this.products.unshift(newProduct);
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to add product:', err);
        this.toastr.error(err.error?.error || err.message || 'Unknown error', 'Failed to add product');
      }
    });
  }

  /**
   * Edit an existing product
   */
  editProduct(product: Product): void {
    this.editingId = product.id;
    this.newProduct = { ...product };
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
    this.currentImageUrl = product.imageUrl && product.imageUrl.length > 0 ? product.imageUrl : null;
    this.hasCurrentSavedImage = !!this.currentImageUrl;
    this.showAddForm = true;

    this.autoFillDescription();
  }

  /**
   * Update an existing product
   */
  updateProduct(): void {
    if (!this.validateProductForm()) {
      this.dialogService.openWarning('Validation required', 'Please fill in all required fields correctly.');
      return;
    }

    if (this.editingId === null) {
      return;
    }

    const payload = this.buildFormData();

    this.productService.updateProduct(this.editingId, payload).subscribe({
      next: (updatedProduct) => {
        this.toastr.success('Product updated successfully!', 'Product updated');
        const index = this.products.findIndex(p => p.id === this.editingId);
        if (index !== -1) {
          this.products[index] = updatedProduct;
        }
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to update product:', err);
        this.toastr.error(err.error?.error || err.message || 'Unknown error', 'Failed to update product');
      }
    });
  }

  /**
   * Delete a product with confirmation
   */
  deleteProduct(product: Product): void {
    this.dialogService.openConfirm(
      'Confirm Delete',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    ).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          this.toastr.success('Product deleted successfully!', 'Product deleted');
          this.products = this.products.filter(p => p.id !== product.id);
        },
        error: (err) => {
          console.error('Failed to delete product:', err);
          this.toastr.error(err.error?.error || err.message || 'Unknown error', 'Failed to delete product');
        }
      });
    });
  }

  /**
   * Reset the form to initial state
   */
  resetForm(): void {
    this.newProduct = {
      name: '',
      description: '',
      category: 'Food & Feed',
      price: 0,
      stock: 0,
      petSpecies: 'OTHER',
      active: true
    };
    this.currentImageUrl = null;
    this.selectedImagePreview = null;
    this.selectedImageFile = null;
    this.hasCurrentSavedImage = false;
    this.editingId = null;
    this.showAddForm = false;
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImageFile = input.files && input.files.length > 0 ? input.files[0] : null;
    
    // Generate preview for the newly selected image
    if (this.selectedImageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImagePreview = e.target?.result as string;
        this.autoFillDescription();
      };
      reader.readAsDataURL(this.selectedImageFile);
    } else {
      this.selectedImagePreview = null;
    }
    
    this.autoFillDescription();
  }

  onNameInput(value: string): void {
    this.newProduct.name = value;
    this.autoFillDescription();
  }

  onCategoryInput(value: string): void {
    this.newProduct.category = value;
    this.autoFillDescription();
  }

  onPetSpeciesInput(value: string): void {
    this.newProduct.petSpecies = value as PetSpecies;
    this.autoFillDescription();
  }

  /**
   * Generate description automatically based on image filename and product name
   */
  autoFillDescription(): void {
    this.newProduct.description = this.buildAutoDescription();
  }

  private buildAutoDescription(): string {
    const productName = (this.newProduct.name ?? '').trim();
    const category = this.newProduct.category || 'Food & Feed';
    const petSpecies = this.newProduct.petSpecies || 'OTHER';

    if (!productName) {
      return '';
    }

    let imageInfo = '';
    if (this.selectedImageFile) {
      const fileName = this.selectedImageFile.name.split('.')[0].replace(/[-_]/g, ' ');
      imageInfo = ` (${fileName})`;
    } else if (this.hasCurrentSavedImage) {
      imageInfo = ' (current image)';
    }

    const categoryDescriptions: { [key: string]: string } = {
      'Food & Feed': `Premium ${productName}${imageInfo} specially formulated for ${this.formatSpecies(petSpecies)}. High-quality nutrition to keep your pet healthy and happy.`,
      'Health Essentials': `${productName}${imageInfo} - Essential health product for ${this.formatSpecies(petSpecies)}. Designed with care to support your pet's wellbeing.`,
      'Accessories': `${productName}${imageInfo} - Quality accessory for ${this.formatSpecies(petSpecies)}. Perfect for comfort, play, and style.`,
      'Merchandise': `${productName}${imageInfo} - Exclusive merchandise for pet lovers. Great gift for ${this.formatSpecies(petSpecies)} enthusiasts!`
    };

    return categoryDescriptions[category] || `${productName}${imageInfo} - Premium pet product for ${this.formatSpecies(petSpecies)}.`;
  }

  /**
   * Format pet species name for readable description
   */
  private formatSpecies(species: string): string {
    const speciesMap: { [key: string]: string } = {
      'DOG': 'dogs',
      'CAT': 'cats',
      'BIRD': 'birds',
      'RABBIT': 'rabbits',
      'HAMSTER': 'hamsters',
      'FISH': 'fish',
      'REPTILE': 'reptiles',
      'OTHER': 'pets'
    };
    return speciesMap[species] || 'pets';
  }

  /**
   * Validate the product form before submission
   */
  private validateProductForm(): boolean {
    if (!this.newProduct.name || this.newProduct.name.trim() === '') {
      return false;
    }
    if (!this.newProduct.description || this.newProduct.description.trim() === '') {
      return false;
    }
    if (this.newProduct.price === null || this.newProduct.price === undefined || this.newProduct.price <= 0) {
      return false;
    }
    if (this.newProduct.stock === null || this.newProduct.stock === undefined || this.newProduct.stock < 0) {
      return false;
    }
    return true;
  }

  /**
   * Handle form submission (add or update)
   */
  onFormSubmit(): void {
    if (this.editingId !== null) {
      this.updateProduct();
    } else {
      this.addProduct();
    }
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    formData.append('name', String(this.newProduct.name ?? ''));
    formData.append('description', String(this.newProduct.description ?? ''));
    formData.append('category', String(this.newProduct.category ?? ''));
    formData.append('price', String(this.newProduct.price ?? 0));
    formData.append('stock', String(this.newProduct.stock ?? 0));
    formData.append('petSpecies', String(this.newProduct.petSpecies ?? 'OTHER'));
    formData.append('active', String(this.newProduct.active ?? true));

    // Only append image if a new file is selected
    // Backend automatically keeps existing image if no new file is provided
    if (this.selectedImageFile) {
      formData.append('imageFile', this.selectedImageFile);
    }

    return formData;
  }
}
