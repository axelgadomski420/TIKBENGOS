import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  DESTINATION_TYPE_CONFIG,
  DOCUMENT_CONFIG,
  TRANSPORT_CONFIG,
  TravelDestination
} from '../../models/travel-destination.model';
import { TravelDestinationService } from '../../services/travel-destination.service';

import { PetFriendlyStarsComponent } from '../../components/pet-friendly-stars/pet-friendly-stars.component';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';

type DocumentItem = {
  key: string;
  icon: string;
  label: string;
};

@Component({
  selector: 'app-destination-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, PetFriendlyStarsComponent, MapPickerComponent],
  templateUrl: './destination-detail.component.html',
  styleUrl: './destination-detail.component.scss'
})
export class DestinationDetailComponent implements OnInit, OnDestroy {
  readonly destinationTypeConfig = DESTINATION_TYPE_CONFIG;
  readonly transportConfig = TRANSPORT_CONFIG;
  readonly placeholderCover = 'images/animals/cat.png';

  readonly uiIcons = {
    back: 'arrow_back',
    alert: 'error_outline',
    placeholder: 'pets',
    left: 'chevron_left',
    right: 'chevron_right',
    location: 'location_on',
    calendar: 'calendar_today',
    documents: 'folder_open',
    tips: 'lightbulb',
    cta: 'flight_takeoff',
    forward: 'arrow_forward'
  };

  destination: TravelDestination | null = null;
  documentItems: DocumentItem[] = [];
  mapFullscreen = false;

  heroImages: string[] = [];
  currentImageIndex = 0;
  starSteps = [1, 2, 3, 4, 5];

  loading = true;
  errorMessage = '';
  @ViewChild('destinationReadonlyMap') private readonly destinationReadonlyMap?: MapPickerComponent;

  private currentDestinationId: number | null = null;
  private readonly destroy$ = new Subject<void>();
  private mapResizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private mapResizeFrameId: number | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly travelDestinationService: TravelDestinationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idValue = params.get('id');
      const destinationId = Number(idValue);

      if (!idValue || Number.isNaN(destinationId) || destinationId <= 0) {
        this.loading = false;
        this.errorMessage = 'Invalid destination selected. Please return to the catalog.';
        this.destination = null;
        this.documentItems = [];
        this.heroImages = [];
        return;
      }

      this.loadDestination(destinationId);
    });
  }

  ngOnDestroy(): void {
    if (this.mapResizeTimeoutId) {
      clearTimeout(this.mapResizeTimeoutId);
      this.mapResizeTimeoutId = null;
    }

    if (this.mapResizeFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.mapResizeFrameId);
      this.mapResizeFrameId = null;
    }

    this.setBodyScrollLocked(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.mapFullscreen) {
      return;
    }

    this.closeMapFullscreen();
  }

  get hasMultipleImages(): boolean {
    return this.heroImages.length > 1;
  }

  goBack(): void {
    this.router.navigate(['/app/transit/destinations']);
  }

  retry(): void {
    if (this.currentDestinationId === null) {
      return;
    }

    this.loadDestination(this.currentDestinationId);
  }

  planTrip(): void {
    if (!this.destination) {
      return;
    }

    this.router.navigate(['/app/transit/plans/new'], {
      queryParams: { destinationId: this.destination.id }
    });
  }

  showPreviousImage(): void {
    if (!this.hasMultipleImages) {
      return;
    }

    this.currentImageIndex =
      this.currentImageIndex === 0 ? this.heroImages.length - 1 : this.currentImageIndex - 1;
  }

  showNextImage(): void {
    if (!this.hasMultipleImages) {
      return;
    }

    this.currentImageIndex =
      this.currentImageIndex >= this.heroImages.length - 1 ? 0 : this.currentImageIndex + 1;
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.heroImages.length) {
      return;
    }

    this.currentImageIndex = index;
  }

  toggleMapFullscreen(): void {
    this.mapFullscreen = !this.mapFullscreen;
    this.setBodyScrollLocked(this.mapFullscreen);
    this.invalidateReadonlyMapSize();
  }

  closeMapFullscreen(): void {
    if (!this.mapFullscreen) {
      return;
    }

    this.mapFullscreen = false;
    this.setBodyScrollLocked(false);
    this.invalidateReadonlyMapSize();
  }

  onHeroImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    image.src = this.placeholderCover;
  }

  trackByImage(index: number): number {
    return index;
  }

  trackByDocument(index: number, document: DocumentItem): string {
    return `${document.key}-${index}`;
  }

  typeIconClass(): string {
    if (!this.destination) {
      return 'explore';
    }

    return this.destinationTypeConfig[this.destination.destinationType].icon;
  }

  transportIconClass(): string {
    if (!this.destination) {
      return 'alt_route';
    }

    return this.transportConfig[this.destination.recommendedTransportType].icon;
  }

  private loadDestination(destinationId: number): void {
    this.currentDestinationId = destinationId;
    this.loading = true;
    this.errorMessage = '';
    this.destination = null;
    this.documentItems = [];
    this.heroImages = [];
    this.currentImageIndex = 0;
    this.mapFullscreen = false;
    this.setBodyScrollLocked(false);

    this.travelDestinationService
      .getDestinationById(destinationId)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (destination) => {
          this.destination = destination;
          this.documentItems = this.buildDocumentItems(destination.requiredDocuments);
          this.heroImages = this.buildHeroImages(destination);
          this.currentImageIndex = 0;
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'Unable to load destination details. Please try again.';
        }
      });
  }

  private buildHeroImages(destination: TravelDestination): string[] {
    const images: string[] = [];
    const imageKeys = new Set<string>();

    const appendUnique = (imageUrl?: string): void => {
      const normalized = (imageUrl ?? '').trim();
      if (!normalized) {
        return;
      }

      const key = normalized.toLowerCase();
      if (imageKeys.has(key)) {
        return;
      }

      imageKeys.add(key);
      images.push(normalized);
    };

    const carouselUrls = (destination.carouselImages ?? [])
      .map((image) => (image.imageUrl ?? '').trim())
      .filter((imageUrl) => imageUrl.length > 0);

    const coverUrl = (destination.coverImageUrl ?? '').trim();
    appendUnique(coverUrl || carouselUrls[0]);
    carouselUrls.forEach((imageUrl) => appendUnique(imageUrl));

    return images;
  }

  private buildDocumentItems(requiredDocuments: string[]): DocumentItem[] {
    return (requiredDocuments ?? []).map((key) => {
      const config = DOCUMENT_CONFIG[key];
      return {
        key,
        icon: config?.icon ?? 'description',
        label: config?.label ?? this.humanizeDocumentKey(key)
      };
    });
  }

  private humanizeDocumentKey(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private invalidateReadonlyMapSize(): void {
    const resizeMap = () => {
      const mapInstance = (this.destinationReadonlyMap as unknown as { map?: { invalidateSize?: () => void } })?.map;
      mapInstance?.invalidateSize?.();
    };

    resizeMap();

    if (typeof window !== 'undefined') {
      if (this.mapResizeFrameId !== null) {
        window.cancelAnimationFrame(this.mapResizeFrameId);
      }
      this.mapResizeFrameId = window.requestAnimationFrame(() => {
        resizeMap();
        this.mapResizeFrameId = null;
      });
    }

    if (this.mapResizeTimeoutId) {
      clearTimeout(this.mapResizeTimeoutId);
    }
    this.mapResizeTimeoutId = setTimeout(() => {
      resizeMap();
      this.mapResizeTimeoutId = null;
    }, 240);
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
