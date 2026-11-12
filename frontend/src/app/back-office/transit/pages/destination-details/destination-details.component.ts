import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  Destination,
  DestinationCarouselImage,
  DestinationType,
  DocumentType,
  TransportType
} from '../../models/destination.model';
import { TransitConfirmationDialogService } from '../../services/transit-confirmation-dialog.service';
import { DestinationService } from '../../services/destination.service';
import { TransitToastService } from '../../services/transit-toast.service';
import { TransitToastContainerComponent } from '../../components/transit-toast-container/transit-toast-container.component';
import { TransitConfirmationDialogComponent } from '../../components/transit-confirmation-dialog/transit-confirmation-dialog.component';
import { DestinationStatusBadgeComponent } from '../../components/destination-status-badge/destination-status-badge.component';
import { PetFriendlyStarsComponent } from '../../components/pet-friendly-stars/pet-friendly-stars.component';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';

type GalleryImage = {
  key: string;
  url: string;
  source: 'cover' | 'carousel';
  alt: string;
};

@Component({
  selector: 'app-destination-details',
  templateUrl: './destination-details.component.html',
  styleUrl: './destination-details.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatTooltipModule,
    TransitToastContainerComponent,
    TransitConfirmationDialogComponent,
    DestinationStatusBadgeComponent,
    PetFriendlyStarsComponent,
    MapPickerComponent
  ]
})
export class DestinationDetailsComponent implements OnInit, OnDestroy {
  readonly placeholderCover = 'images/animals/cat.png';

  destination: Destination | null = null;
  galleryImages: GalleryImage[] = [];
  activeGalleryIndex = 0;
  lightboxIndex = 0;
  lightboxOpen = false;
  isMapFullscreen = false;

  loading = true;
  errorMessage = '';
  actionInProgress = false;
  mapSearchQuery = '';

  private countryRegionChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly fallbackByType: Record<DestinationType, string> = {
    BEACH: 'images/animals/turtle.png',
    MOUNTAIN: 'images/animals/pony.png',
    CITY: 'images/animals/parakeet.png',
    FOREST: 'images/animals/hamster.png',
    ROAD_TRIP: 'images/animals/chick.png',
    INTERNATIONAL: 'images/animals/cat.png'
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destinationService: DestinationService,
    private readonly transitConfirmationDialogService: TransitConfirmationDialogService,
    private readonly transitToastService: TransitToastService
  ) {}

  ngOnInit(): void {
    this.loadDestination();
  }

  ngOnDestroy(): void {
    if (this.countryRegionChangeTimeout) {
      clearTimeout(this.countryRegionChangeTimeout);
      this.countryRegionChangeTimeout = null;
    }

    this.setBodyScrollLocked(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.lightboxOpen) {
        event.preventDefault();
        this.closeLightbox();
        return;
      }

      if (this.isMapFullscreen) {
        event.preventDefault();
        this.closeMapFullscreen();
      }
      return;
    }

    if (!this.lightboxOpen) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.showPreviousLightboxImage();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.showNextLightboxImage();
    }
  }

  get hasGalleryCarousel(): boolean {
    return this.galleryImages.length > 1;
  }

  get currentGalleryImage(): GalleryImage | null {
    return this.galleryImages[this.activeGalleryIndex] ?? this.galleryImages[0] ?? null;
  }

  get currentLightboxImage(): GalleryImage | null {
    return this.galleryImages[this.lightboxIndex] ?? this.currentGalleryImage;
  }

  goBack(): void {
    this.router.navigate(['/admin/transit/destinations']);
  }

  editDestination(): void {
    if (!this.destination?.id) {
      return;
    }

    this.router.navigate(['/admin/transit/destinations', this.destination.id, 'edit']);
  }

  toggleArchive(): void {
    if (!this.destination?.id || this.actionInProgress) {
      return;
    }

    const isArchived = this.destination.status === 'ARCHIVED';
    this.transitConfirmationDialogService
      .confirm({
        title: isArchived
          ? `Restore "${this.destination.title}"?`
          : `Archive "${this.destination.title}"?`,
        message: isArchived
          ? 'This destination will return to active workflow processing.'
          : 'This destination will move to archived state.',
        confirmLabel: isArchived ? 'Restore' : 'Archive',
        cancelLabel: 'Cancel',
        tone: 'warning'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.executeArchiveAction(this.destination?.id as number, isArchived);
      });
  }

  deleteDestination(): void {
    if (!this.destination?.id || this.actionInProgress) {
      return;
    }

    if (!this.canDeleteDestination()) {
      return;
    }

    this.transitConfirmationDialogService
      .confirm({
        title: `Delete "${this.destination.title}"?`,
        message: 'This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger'
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.executeDeleteAction(this.destination?.id as number);
      });
  }

  reload(): void {
    this.loadDestination();
  }

  formatDestinationType(destinationType: DestinationType): string {
    return this.destinationService.formatDestinationType(destinationType);
  }

  formatTransportType(transportType: TransportType): string {
    return this.destinationService.formatTransportType(transportType);
  }

  formatDocument(documentType: DocumentType): string {
    return this.destinationService.formatDocumentType(documentType);
  }

  getDestinationTypeIcon(destinationType: DestinationType): string {
    switch (destinationType) {
      case 'BEACH':
        return 'fa-umbrella-beach';
      case 'MOUNTAIN':
        return 'fa-mountain';
      case 'CITY':
        return 'fa-city';
      case 'FOREST':
        return 'fa-tree';
      case 'ROAD_TRIP':
        return 'fa-road';
      case 'INTERNATIONAL':
      default:
        return 'fa-globe';
    }
  }

  getTransportIcon(transportType: TransportType): string {
    switch (transportType) {
      case 'CAR':
        return 'fa-car-side';
      case 'TRAIN':
        return 'fa-train';
      case 'PLANE':
        return 'fa-plane-departure';
      case 'BUS':
      default:
        return 'fa-bus';
    }
  }

  getCoverImage(destination: Destination): string {
    const explicitCover = this.destinationService.resolveCoverImageUrl(destination.coverImageUrl);
    if (explicitCover.length > 0) {
      const versionSeed = destination.updatedAt ?? destination.createdAt ?? destination.publishedAt ?? null;
      return this.destinationService.appendCacheBuster(explicitCover, versionSeed);
    }

    return this.fallbackByType[destination.destinationType] ?? this.placeholderCover;
  }

  selectGalleryImage(index: number): void {
    if (!this.galleryImages[index]) {
      return;
    }

    this.activeGalleryIndex = index;
  }

  showPreviousGalleryImage(): void {
    if (!this.hasGalleryCarousel) {
      return;
    }

    const lastIndex = this.galleryImages.length - 1;
    this.activeGalleryIndex = this.activeGalleryIndex === 0 ? lastIndex : this.activeGalleryIndex - 1;
  }

  showNextGalleryImage(): void {
    if (!this.hasGalleryCarousel) {
      return;
    }

    const lastIndex = this.galleryImages.length - 1;
    this.activeGalleryIndex = this.activeGalleryIndex === lastIndex ? 0 : this.activeGalleryIndex + 1;
  }

  openLightbox(index = this.activeGalleryIndex): void {
    if (!this.galleryImages[index]) {
      return;
    }

    this.lightboxIndex = index;
    this.lightboxOpen = true;
    this.syncBodyScrollLock();
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
    this.syncBodyScrollLock();
  }

  toggleMapFullscreen(): void {
    this.isMapFullscreen = !this.isMapFullscreen;
    this.syncBodyScrollLock();

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  closeMapFullscreen(): void {
    if (!this.isMapFullscreen) {
      return;
    }

    this.isMapFullscreen = false;
    this.syncBodyScrollLock();
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  showPreviousLightboxImage(): void {
    if (!this.hasGalleryCarousel) {
      return;
    }

    const lastIndex = this.galleryImages.length - 1;
    this.lightboxIndex = this.lightboxIndex === 0 ? lastIndex : this.lightboxIndex - 1;
    this.activeGalleryIndex = this.lightboxIndex;
  }

  showNextLightboxImage(): void {
    if (!this.hasGalleryCarousel) {
      return;
    }

    const lastIndex = this.galleryImages.length - 1;
    this.lightboxIndex = this.lightboxIndex === lastIndex ? 0 : this.lightboxIndex + 1;
    this.activeGalleryIndex = this.lightboxIndex;
  }

  trackByGalleryImage(index: number, image: GalleryImage): string {
    return image.key || `gallery-${index}`;
  }

  onGalleryImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    image.src = this.placeholderCover;
  }

  hasCoordinates(destination: Destination): boolean {
    return (
      destination.latitude !== null &&
      destination.latitude !== undefined &&
      destination.longitude !== null &&
      destination.longitude !== undefined
    );
  }

  canDeleteDestination(): boolean {
    return Number(this.destination?.linkedPlansCount ?? 0) === 0;
  }

  getDestinationDeleteTooltip(): string {
    const linkedPlansCount = Number(this.destination?.linkedPlansCount ?? 0);
    if (linkedPlansCount > 0) {
      return `Cannot delete — ${linkedPlansCount} travel plan(s) linked to this destination`;
    }

    return '';
  }

  onCountryOrRegionChange(): void {
    if (this.countryRegionChangeTimeout) {
      clearTimeout(this.countryRegionChangeTimeout);
    }

    this.countryRegionChangeTimeout = setTimeout(() => {
      const country = this.destination?.country?.trim() || '';
      const region = this.destination?.region?.trim() || '';

      if (country.length >= 2) {
        this.mapSearchQuery = region.length >= 2 ? `${region}, ${country}` : country;
      }
    }, 800);
  }

  onMapLocationSelected(coords: { lat: number; lng: number }): void {
    if (!this.destination) {
      return;
    }

    this.destination = {
      ...this.destination,
      latitude: coords.lat,
      longitude: coords.lng
    };
  }

  onLocationResolved(event: { lat: number; lng: number; country: string; region: string }): void {
    if (!this.destination) {
      return;
    }

    const currentCountry = this.destination.country?.trim() || '';
    const currentRegion = this.destination.region?.trim() || '';

    this.destination = {
      ...this.destination,
      country: event.country && event.country !== currentCountry ? event.country : this.destination.country,
      region: event.region && event.region !== currentRegion ? event.region : this.destination.region,
      latitude: event.lat,
      longitude: event.lng
    };
  }

  private loadDestination(): void {
    this.loading = true;
    this.errorMessage = '';
    const rawId = this.route.snapshot.paramMap.get('id');
    const destinationId = rawId ? Number(rawId) : Number.NaN;

    if (!Number.isFinite(destinationId)) {
      this.loading = false;
      this.errorMessage = 'Invalid destination id.';
      return;
    }

    this.destinationService
      .getDestinationById(destinationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (destination) => {
          this.applyDestinationPayload(destination);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Unable to load destination details. Please try again.';
        }
      });
  }

  private executeArchiveAction(destinationId: number, isArchived: boolean): void {
    this.actionInProgress = true;

    const request$ = isArchived
      ? this.destinationService.unarchiveDestination(destinationId)
      : this.destinationService.archiveDestination(destinationId);

    request$
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (updatedDestination) => {
          this.applyDestinationPayload(updatedDestination);
          this.transitToastService.success(
            isArchived ? 'Destination restored' : 'Destination archived',
            isArchived
              ? 'Destination has been restored for active workflow processing.'
              : 'Destination is now archived.'
          );
        },
        error: () => {
          this.transitToastService.error(
            'Action failed',
            isArchived
              ? 'Unable to restore destination right now.'
              : 'Unable to archive destination right now.'
          );
        }
      });
  }

  private executeDeleteAction(destinationId: number): void {
    this.actionInProgress = true;

    this.destinationService
      .deleteDestination(destinationId)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.transitToastService.success(
            'Destination deleted',
            'Destination has been removed permanently.'
          );
          this.router.navigate(['/admin/transit/destinations']);
        },
        error: () => {
          this.transitToastService.error(
            'Delete failed',
            'Unable to delete this destination right now.'
          );
        }
      });
  }

  private applyDestinationPayload(destination: Destination): void {
    this.destination = destination;
    const country = destination.country?.trim() || '';
    const region = destination.region?.trim() || '';
    this.mapSearchQuery = country.length >= 2 ? (region.length >= 2 ? `${region}, ${country}` : country) : '';
    this.galleryImages = this.buildGalleryImages(destination);

    if (this.galleryImages.length === 0) {
      this.activeGalleryIndex = 0;
      this.lightboxIndex = 0;
      this.closeLightbox();
      return;
    }

    const maxIndex = this.galleryImages.length - 1;
    this.activeGalleryIndex = Math.min(this.activeGalleryIndex, maxIndex);
    this.lightboxIndex = Math.min(this.lightboxIndex, maxIndex);
  }

  private buildGalleryImages(destination: Destination): GalleryImage[] {
    const coverImage = this.getCoverImage(destination);
    const images: GalleryImage[] = [
      {
        key: `cover-${destination.id ?? 'new'}`,
        url: coverImage,
        source: 'cover',
        alt: `${destination.title} cover image`
      }
    ];

    const seen = new Set<string>([coverImage]);
    const carouselImages = destination.carouselImages ?? [];

    for (let index = 0; index < carouselImages.length; index += 1) {
      const carouselImage = carouselImages[index];
      const resolvedUrl = this.resolveCarouselImageUrl(carouselImage);
      if (!resolvedUrl || seen.has(resolvedUrl)) {
        continue;
      }

      seen.add(resolvedUrl);
      images.push({
        key: `carousel-${carouselImage.id ?? index}-${resolvedUrl}`,
        url: resolvedUrl,
        source: 'carousel',
        alt: `${destination.title} gallery image ${images.length}`
      });
    }

    return images;
  }

  private resolveCarouselImageUrl(image: DestinationCarouselImage): string {
    return this.destinationService.resolveDestinationImageUrl(image.imageUrl);
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private syncBodyScrollLock(): void {
    this.setBodyScrollLocked(this.lightboxOpen || this.isMapFullscreen);
  }
}

