import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { CategoryCarouselComponent } from '../../components/category-carousel/category-carousel.component';
import { DestinationCardComponent } from '../../components/destination-card/destination-card.component';
import {
  DESTINATION_TYPE_CONFIG,
  DestinationType,
  TravelDestinationSummary
} from '../../models/travel-destination.model';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TravelDestinationService } from '../../services/travel-destination.service';

type FeatureItem = {
  icon: string;
  title: string;
  description: string;
  tone: 'primary' | 'accent' | 'blue' | 'red';
};

type StepItem = {
  number: string;
  icon: string;
  title: string;
  description: string;
};

@Component({
  selector: 'app-destination-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    CategoryCarouselComponent,
    DestinationCardComponent,
    PaginationComponent
  ],
  templateUrl: './destination-catalog.component.html',
  styleUrl: './destination-catalog.component.scss'
})
export class DestinationCatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('exploreByTypeSection') exploreByTypeSection?: ElementRef<HTMLElement>;
  @ViewChildren('featureCard') featureCards!: QueryList<ElementRef<HTMLElement>>;

  // ── FIX 1: Hero parallax ──────────────────────────────────────────────────
  heroParallax = 0;

  @HostListener('window:scroll', [])
  onScroll(): void {
    const scrollY = window.scrollY;
    this.heroParallax = scrollY * 0.4;
  }
  // ─────────────────────────────────────────────────────────────────────────

  readonly typeConfigs = DESTINATION_TYPE_CONFIG;
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  readonly features: FeatureItem[] = [
    {
      icon: 'check_circle',
      title: 'Verified Destinations',
      description:
        'Every destination is analyzed and certified pet-friendly by our expert team before being published.',
      tone: 'primary'
    },
    {
      icon: 'description',
      title: 'Document Checklist',
      description:
        'Know exactly which documents are required before planning your trip. No surprises at the border.',
      tone: 'accent'
    },
    {
      icon: 'security',
      title: 'Safety Guidelines',
      description:
        "Step-by-step safety checklist tailored to your pet's profile and travel route.",
      tone: 'blue'
    },
    {
      icon: 'reviews',
      title: 'Traveler Reviews',
      description:
        'Read verified experiences from other pet owners who traveled these exact routes.',
      tone: 'red'
    }
  ];

  readonly planningSteps: StepItem[] = [
    {
      number: '01',
      icon: 'map',
      title: 'Choose a Destination',
      description:
        "Browse our verified catalog and find the perfect destination that fits your pet's needs."
    },
    {
      number: '02',
      icon: 'checklist',
      title: 'Prepare Your Documents',
      description:
        'Upload required documents. Our system validates them and alerts you if anything is missing.'
    },
    {
      number: '03',
      icon: 'flight_takeoff',
      title: 'Travel with Confidence',
      description:
        'Depart knowing everything is in order. Share feedback after your journey.'
    }
  ];

  destinations: TravelDestinationSummary[] = [];
  filteredDestinations: TravelDestinationSummary[] = [];
  selectedType: DestinationType | null = null;

  selectedCountry = 'ALL';
  selectedRegion = 'ALL';
  searchTerm = '';
  startDateFilter = '';
  endDateFilter = '';
  showFilters = false;

  loading = true;
  errorMessage = '';
  currentPage = 1;
  itemsPerPage = 9;
  totalItems = 0;

  private readonly destroy$ = new Subject<void>();
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(
    private readonly travelDestinationService: TravelDestinationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadDestinations();
  }

  ngAfterViewInit(): void {
    this.setupRevealObserver();

    this.featureCards.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.setupRevealObserver();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
  }

  get destinationCountLabel(): string {
    const count = this.filteredDestinations.length;
    return `${count} destination${count === 1 ? '' : 's'}`;
  }

  get paginatedDestinations(): TravelDestinationSummary[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDestinations.slice(start, start + this.itemsPerPage);
  }

  get availableCountries(): string[] {
    const countries = new Set<string>();

    this.destinations.forEach((destination) => {
      const country = destination.country?.trim();
      if (country) {
        countries.add(country);
      }
    });

    return [...countries].sort((a, b) => a.localeCompare(b));
  }

  get availableRegions(): string[] {
    const regions = new Set<string>();

    this.destinations
      .filter((destination) => this.selectedCountry === 'ALL' || destination.country === this.selectedCountry)
      .forEach((destination) => {
        const region = destination.region?.trim();
        if (region) {
          regions.add(region);
        }
      });

    return [...regions].sort((a, b) => a.localeCompare(b));
  }

  get hasLocationFilter(): boolean {
    return this.selectedCountry !== 'ALL' || this.selectedRegion !== 'ALL';
  }

  get hasActiveFilters(): boolean {
    return (
      this.hasLocationFilter ||
      this.selectedType !== null ||
      this.searchTerm.trim().length > 0 ||
      Boolean(this.startDateFilter) ||
      Boolean(this.endDateFilter)
    );
  }

  onTypeSelected(type: DestinationType | null): void {
    this.selectedType = type;
    this.currentPage = 1;
    this.applyFilter();
  }

  onCountryChange(): void {
    if (this.selectedRegion !== 'ALL' && !this.availableRegions.includes(this.selectedRegion)) {
      this.selectedRegion = 'ALL';
    }

    this.currentPage = 1;
    this.applyFilter();
  }

  onRegionChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearLocationFilters(): void {
    this.selectedCountry = 'ALL';
    this.selectedRegion = 'ALL';
    this.searchTerm = '';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
    this.loadDestinations();
  }

  showAllDestinations(): void {
    this.selectedType = null;
    this.selectedCountry = 'ALL';
    this.selectedRegion = 'ALL';
    this.searchTerm = '';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
    this.loadDestinations();
  }

  onStartDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.startDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
    this.loadDestinations();
  }

  onEndDateFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.endDateFilter = String(target?.value ?? '').trim();
    this.currentPage = 1;
    this.loadDestinations();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exploreDestination(destinationId: number): void {
    this.router.navigate(['/app/transit/destinations', destinationId]);
  }

  planTrip(destinationId: number): void {
    this.router.navigate(['/app/transit/plans/new'], {
      queryParams: { destinationId }
    });
  }

  goToMyPlans(): void {
    this.router.navigate(['/app/transit/plans/my']);
  }

  retryLoad(): void {
    this.loadDestinations();
  }

  scrollToExploreByType(): void {
    this.scrollToSection('explore-by-type');
  }

  scrollToDestinations(): void {
    this.scrollToSection('destinations');
  }

  scrollToGuide(): void {
    this.scrollToSection('how-it-works');
  }

  toneClass(feature: FeatureItem): string {
    return `tone-${feature.tone}`;
  }

  private loadDestinations(): void {
    this.loading = true;
    this.errorMessage = '';

    this.travelDestinationService
      .getPublishedDestinations({
        startDate: this.startDateFilter || undefined,
        endDate: this.endDateFilter || undefined
      })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (destinations) => {
          this.destinations = destinations;
          this.applyFilter();
        },
        error: (error: unknown) => {
          if (error instanceof Error) {
            this.errorMessage = error.message;
            return;
          }

          this.errorMessage = 'Unable to load destinations. Please try again.';
        }
      });
  }

  private applyFilter(): void {
    const keyword = this.searchTerm.trim().toLowerCase();

    this.filteredDestinations = this.destinations.filter((destination) => {
      const typeMatch = !this.selectedType || destination.destinationType === this.selectedType;
      const countryMatch = this.selectedCountry === 'ALL' || destination.country === this.selectedCountry;
      const regionMatch = this.selectedRegion === 'ALL' || destination.region === this.selectedRegion;
      const searchMatch =
        !keyword ||
        destination.title.toLowerCase().includes(keyword) ||
        destination.country.toLowerCase().includes(keyword) ||
        (destination.region ?? '').toLowerCase().includes(keyword);

      return typeMatch && countryMatch && regionMatch && searchMatch;
    });

    this.totalItems = this.filteredDestinations.length;
    if (this.totalItems === 0) {
      this.currentPage = 1;
      return;
    }

    const maxPage = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
  }

  private scrollToSection(sectionId: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const target =
      document.getElementById(sectionId) ??
      (sectionId === 'explore-by-type' ? this.exploreByTypeSection?.nativeElement ?? null : null);

    if (!target) {
      return;
    }

    const top = window.scrollY + target.getBoundingClientRect().top - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  private setupRevealObserver(): void {
    this.intersectionObserver?.disconnect();

    if (typeof window === 'undefined' || !this.featureCards?.length) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.intersectionObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 }
    );

    this.featureCards.forEach((cardRef, index) => {
      const cardEl = cardRef.nativeElement;
      cardEl.style.setProperty('--reveal-delay', `${index * 0.1}s`);
      this.intersectionObserver?.observe(cardEl);
    });
  }
}
