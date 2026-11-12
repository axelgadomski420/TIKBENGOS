
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminCategoryService, AdminAuthService } from '../../services/admin-api.service';
import { EventCategory } from '../../models/admin-events.models';
import { PetTransitToastService } from '../../../../front-office/pet-transit/services/pet-transit-toast.service';
import { PetTransitToastContainerComponent } from '../../../../front-office/pet-transit/components/pet-transit-toast-container/pet-transit-toast-container.component';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PetTransitToastContainerComponent],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css']
})
export class AdminCategoriesComponent implements OnInit {
  
  categories: EventCategory[] = [];
  loading = true;
  error = '';
  pendingDeleteCategory: EventCategory | null = null;
  deletingCategory = false;
  
  // Form modal
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  formError = '';
  
  form = {
    name: '',
    icon: 'calendar',
    description: '',
    requiresApproval: false,
    competitionMode: false  // ✅ AJOUTER
  };
  
  get approvalRequiredCount(): number {
    return this.categories.filter(cat => cat.requiresApproval).length;
  }
  
  get competitionCount(): number {
    return this.categories.filter(cat => cat.competitionMode).length;
  }
  
  constructor(
    private categoryService: AdminCategoryService,
    private auth: AdminAuthService,
    private router: Router,
    private toastService: PetTransitToastService
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.categoryService.getAll(this.auth.getAdminId()).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading categories', err);
        this.error = 'Failed to load categories';
        this.loading = false;
      }
    });
  }

  openCreateForm() {
    this.isEditing = false;
    this.editingId = null;
    this.form = {
      name: '',
      icon: 'calendar',
      description: '',
      requiresApproval: false,
      competitionMode: false  // ✅ AJOUTER
    };
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(category: EventCategory) {
    this.isEditing = true;
    this.editingId = category.id;
    this.form = {
      name: category.name,
      icon: category.icon || 'calendar',
      description: category.description || '',
      requiresApproval: category.requiresApproval,
      competitionMode: category.competitionMode || false  // ✅ AJOUTER
    };
    this.formError = '';
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';
  }

  saveCategory() {
    if (!this.form.name.trim()) {
      this.formError = 'Category name is required';
      return;
    }

    const adminId = this.auth.getAdminId();
    const data = {
      name: this.form.name.trim(),
      icon: this.form.icon || 'calendar',
      description: this.form.description,
      requiresApproval: this.form.requiresApproval,
      competitionMode: this.form.competitionMode  // ✅ AJOUTER
    };

    if (this.isEditing && this.editingId) {
      this.categoryService.update(this.editingId, data, adminId).subscribe({
        next: () => {
          this.closeForm();
          this.loadCategories();
        },
        error: (err) => {
          this.formError = err.error?.message || 'Failed to update category';
        }
      });
    } else {
      this.categoryService.create(data, adminId).subscribe({
        next: () => {
          this.closeForm();
          this.loadCategories();
        },
        error: (err) => {
          this.formError = err.error?.message || 'Failed to create category';
        }
      });
    }
  }

  deleteCategory(category: EventCategory) {
    if (this.deletingCategory) {
      return;
    }
    this.pendingDeleteCategory = category;
  }

  closeDeleteDialog(): void {
    if (this.deletingCategory) {
      return;
    }

    this.pendingDeleteCategory = null;
    this.toastService.warning('Action cancelled successfully.');
  }

  confirmDeleteCategory(): void {
    if (!this.pendingDeleteCategory || this.deletingCategory) {
      return;
    }

    const category = this.pendingDeleteCategory;
    this.deletingCategory = true;

    const adminId = this.auth.getAdminId();
    this.categoryService
      .delete(category.id, adminId)
      .pipe(
        finalize(() => {
          this.deletingCategory = false;
        })
      )
      .subscribe({
        next: () => {
          this.pendingDeleteCategory = null;
          this.toastService.success('Category deleted successfully.');
          this.loadCategories();
        },
        error: (err) => {
          const message = err.error?.message || 'Failed to delete category';
          this.toastService.error(message);
        }
      });
  }

  getCategoryIconClass(icon: string | null | undefined): string {
    const raw = (icon || '').trim().toLowerCase();

    if (!raw) {
      return 'fa-calendar-days';
    }

    const aliases: Record<string, string> = {
      calendar: 'fa-calendar-days',
      event: 'fa-calendar-days',
      date: 'fa-calendar-days',
      competition: 'fa-trophy',
      trophy: 'fa-trophy',
      sport: 'fa-futbol',
      sports: 'fa-futbol',
      workshop: 'fa-screwdriver-wrench',
      workshops: 'fa-screwdriver-wrench',
      education: 'fa-graduation-cap',
      course: 'fa-graduation-cap',
      class: 'fa-graduation-cap',
      theater: 'fa-masks-theater',
      theatre: 'fa-masks-theater',
      music: 'fa-music',
      concert: 'fa-music',
      art: 'fa-palette',
      pet: 'fa-paw',
      pets: 'fa-paw',
      animal: 'fa-paw',
      book: 'fa-book-open',
      books: 'fa-book-open',
      tech: 'fa-microchip',
      technology: 'fa-microchip',
      food: 'fa-utensils',
      travel: 'fa-earth-europe',
      health: 'fa-heart-pulse',
      charity: 'fa-hand-holding-heart',
      business: 'fa-briefcase',
      party: 'fa-champagne-glasses',
      online: 'fa-video',
      virtual: 'fa-video',
      webinar: 'fa-video'
    };

    if (aliases[raw]) {
      return aliases[raw];
    }

    const emojiAliases: Record<string, string> = {
      '📅': 'fa-calendar-days',
      '🏆': 'fa-trophy',
      '⚽': 'fa-futbol',
      '🎭': 'fa-masks-theater',
      '🎵': 'fa-music',
      '🎨': 'fa-palette',
      '🐾': 'fa-paw',
      '📚': 'fa-book-open',
      '💻': 'fa-microchip',
      '🍽️': 'fa-utensils',
      '✈️': 'fa-earth-europe',
      '❤️': 'fa-heart-pulse',
      '🎉': 'fa-champagne-glasses'
    };

    return emojiAliases[icon || ''] || 'fa-calendar-days';
  }

  goBack(): void {
    this.router.navigate(['/admin/events']);
  }
}
