import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceCategoryService, ServiceCategory } from '../../../back-office/services/service-category.service';

interface CategoryCard {
  id?: number;
  name: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

@Component({
  selector: 'app-service-category-picker',
  templateUrl: './service-category-picker.component.html',
  styleUrls: ['./service-category-picker.component.css']
})
export class ServiceCategoryPickerComponent implements OnInit {

  loading = true;
  categories: CategoryCard[] = [];
  hoveredCard: string | null = null;

  private readonly categoryMeta: Record<string, Omit<CategoryCard, 'id' | 'name'>> = {
    VETERINARY: {
      label: 'Veterinary',
      description: 'Medical services, consultations, surgery, and vaccinations',
      icon: '🩺',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    GROOMING: {
      label: 'Grooming',
      description: 'Care and beauty: bath, cut, special products',
      icon: '✂️',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-100'
    },
    TRAINING: {
      label: 'Training',
      description: 'Dog training: obedience, behavior, agility',
      icon: '🎓',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    },
    BOARDING: {
      label: 'Boarding',
      description: 'Day or night care for your pet with a host family',
      icon: '🏠',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100'
    },
    HOTEL: {
      label: 'Hotel',
      description: 'Premium accommodation with rooms, camera, and staff',
      icon: '🏨',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100'
    },
    WALKING: {
      label: 'Dog Walking',
      description: 'Group or individual dog walks',
      icon: '🚶',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100'
    }
  };

  constructor(
    private router: Router,
    private categoryService: ServiceCategoryService
  ) {}

  ngOnInit(): void {
    this.categoryService.findAll().subscribe({
      next: (cats: ServiceCategory[]) => {
        this.categories = cats.map(cat => {
          const meta = this.categoryMeta[cat.name.toUpperCase()] ?? {
            label: cat.name,
            description: cat.description || 'Service spécialisé',
            icon: '🐾',
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200'
          };
          return { id: cat.id, name: cat.name, ...meta };
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectCategory(cat: CategoryCard): void {
    this.router.navigate(
      ['/admin/services/new'],
      { queryParams: { categoryId: cat.id, categoryName: cat.name, categoryLabel: cat.label } }
    );
  }

  goBack(): void {
    this.router.navigate(['/admin/services']);
  }
}
