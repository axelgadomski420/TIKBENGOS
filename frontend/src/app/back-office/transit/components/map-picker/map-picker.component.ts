import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-picker.component.html',
  styleUrl: './map-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() readonly = false;
  @Input() height = '320px';
  @Input() markerLabel = '';
  @Input() searchQuery = '';

  @Output() readonly locationSelected = new EventEmitter<{ lat: number; lng: number }>();
  @Output() readonly locationResolved = new EventEmitter<{
    lat: number;
    lng: number;
    country: string;
    region: string;
  }>();

  @ViewChild('mapContainer', { static: true }) private readonly mapContainer!: ElementRef<HTMLDivElement>;

  selectedLat: number | null = null;
  selectedLng: number | null = null;

  private leafletNamespace: typeof import('leaflet') | null = null;
  private map: import('leaflet').Map | null = null;
  private marker: import('leaflet').Marker | null = null;
  private customIcon: import('leaflet').DivIcon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly windowResizeHandler = () => this.safeInvalidateSize();

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchQuery'] && !changes['searchQuery'].firstChange && this.map) {
      const query = changes['searchQuery'].currentValue as string;
      if (query && query.trim().length >= 3) {
        this.geocodeAndMove(query);
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    const L = await import('leaflet');
    this.leafletNamespace = L;

    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'assets/leaflet/marker-icon.png',
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const defaultCenter: [number, number] = [36.8065, 10.1815];
    const center: [number, number] =
      this.latitude != null && this.longitude != null ? [this.latitude, this.longitude] : defaultCenter;

    this.map = L.map(this.mapContainer.nativeElement, {
      center,
      zoom: this.latitude != null ? 10 : 5,
      scrollWheelZoom: !this.readonly
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap</a> contributors',
      maxZoom: 19,
      crossOrigin: true
    }).addTo(this.map);

    this.customIcon = L.divIcon({
      className: '',
      html: `<div class="map-marker-pin">
             <span class="material-icons-round">place</span>
           </div>`,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44]
    });

    if (this.latitude != null && this.longitude != null) {
      this.placeMarker(this.latitude, this.longitude);
      this.selectedLat = this.latitude;
      this.selectedLng = this.longitude;

      if (this.readonly && this.markerLabel) {
        this.marker?.bindPopup(this.markerLabel).openPopup();
      }
    }

    if (!this.readonly) {
      this.map.on('click', async (e: import('leaflet').LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        this.placeMarker(lat, lng);
        this.selectedLat = lat;
        this.selectedLng = lng;
        this.locationSelected.emit({ lat, lng });
        this.cdr.markForCheck();

        // Reverse geocode map clicks to resolve country/region fields.
        await this.reverseGeocode(lat, lng);
      });
    }

    this.setupMapResizeHandling();

    this.cdr.markForCheck();
  }

  async geocodeAndMove(query: string): Promise<void> {
    if (!query || query.trim().length < 3) {
      return;
    }

    if (!this.map) {
      return;
    }

    try {
      const url =
        'https://nominatim.openstreetmap.org/search' +
        `?q=${encodeURIComponent(query)}` +
        '&format=json&limit=1&addressdetails=1';

      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const results = await response.json();

      if (!results || results.length === 0) {
        return;
      }

      const result = results[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      this.map.setView([lat, lng], 8);
      this.placeMarker(lat, lng);

      this.selectedLat = lat;
      this.selectedLng = lng;
      this.locationSelected.emit({ lat, lng });
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('[MAP] Geocode failed:', e);
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const url =
        'https://nominatim.openstreetmap.org/reverse' +
        `?lat=${lat}&lon=${lng}` +
        '&format=json&addressdetails=1';

      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const result = await response.json();

      if (!result || !result.address) {
        return;
      }

      const address = result.address;
      const country = address.country || '';
      const region = address.state || address.region || address.county || address.city || '';

      this.locationResolved.emit({
        lat,
        lng,
        country,
        region
      });
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('[MAP] Reverse geocode failed:', e);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.windowResizeHandler);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private setupMapResizeHandling(): void {
    this.safeInvalidateSize();

    // Re-run after async layout/animation completes to avoid the classic single-tile Leaflet rendering glitch.
    setTimeout(() => this.safeInvalidateSize(), 120);
    setTimeout(() => this.safeInvalidateSize(), 380);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.safeInvalidateSize());
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    }

    window.addEventListener('resize', this.windowResizeHandler);
  }

  private safeInvalidateSize(): void {
    if (!this.map) {
      return;
    }

    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map || !this.leafletNamespace || !this.customIcon) {
      return;
    }

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = this.leafletNamespace.marker([lat, lng], { icon: this.customIcon }).addTo(this.map);
    }

    if (this.readonly && this.markerLabel) {
      this.marker.bindPopup(this.markerLabel).openPopup();
    }
  }
}
