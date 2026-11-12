// location-map.component.ts
import { Component, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-map-container">
      <!-- Barre de recherche -->
      <div class="search-bar">
        <div class="aef-input-with-icon">
          <i class="fas fa-search" aria-hidden="true"></i>
          <input 
            type="text" 
            class="aef-input aef-input--icon"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchLocation()"
            placeholder="Search for a city, venue or address..."
          >
          <button class="search-btn" (click)="searchLocation()" [disabled]="!searchQuery">
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- La carte -->
      <div id="map" class="map-container"></div>

      <!-- Informations du lieu sélectionné -->
      <div class="location-info" *ngIf="selectedAddress">
        <div class="location-info__icon">
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <div class="location-info__content">
          <div class="location-info__title">{{ selectedName }}</div>
          <div class="location-info__address">{{ selectedAddress }}</div>
        </div>
        <button class="location-info__clear" (click)="clearLocation()" type="button">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Message d'instruction -->
      <div class="map-instruction" *ngIf="!selectedAddress">
        <i class="fas fa-hand-pointer"></i>
        <span>Click on the map or search to select a location</span>
      </div>
    </div>
  `,
  styles: [`
    .location-map-container {
      width: 100%;
    }

    .search-bar {
      margin-bottom: 1rem;
    }

    .search-bar .aef-input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-bar .aef-input-with-icon i:first-child {
      position: absolute;
      left: 1rem;
      color: #9ca3af;
      z-index: 1;
    }

    .search-bar .aef-input {
      padding-right: 3.5rem;
      padding-left: 2.5rem;
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 0.875rem;
    }

    .search-btn {
      position: absolute;
      right: 0.5rem;
      background: #3b82f6;
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .search-btn:hover:not(:disabled) {
      background: #2563eb;
      transform: translateX(2px);
    }

    .search-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .map-container {
      width: 100%;
      height: 350px;
      border-radius: 0.75rem;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      margin-bottom: 1rem;
    }

    .location-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
      border-radius: 0.75rem;
      border: 1px solid #bfdbfe;
      margin-bottom: 1rem;
    }

    .location-info__icon {
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .location-info__content {
      flex: 1;
    }

    .location-info__title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .location-info__address {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .location-info__clear {
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .location-info__clear:hover {
      background: #f3f4f6;
      transform: scale(1.05);
    }

    .map-instruction {
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.5rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .map-instruction i {
      color: #3b82f6;
    }
  `]
})
export class LocationMapComponent implements AfterViewInit {
  @Input() initialLocation: string = '';
  @Output() locationSelected = new EventEmitter<string>();
  
  private map: any;
  private marker: any;
  searchQuery: string = '';
  selectedAddress: string = '';
  selectedName: string = '';
  isLoading: boolean = false;
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }
  
  private initMap() {
    // Coordonnées par défaut (Casablanca, Maroc)
    const defaultCenter: L.LatLngExpression = [33.5731, -7.5898];
    
    this.map = L.map('map').setView(defaultCenter, 12);
    
    // Ajout des tuiles OpenStreetMap (gratuit)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 3
    }).addTo(this.map);
    
    // Click sur la carte pour sélectionner un lieu
    this.map.on('click', (e: any) => {
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
    
    // Si location initiale existe
    if (this.initialLocation) {
      this.geocodeAddress(this.initialLocation);
    }
  }
  
  // Recherche de lieu par texte
  async searchLocation() {
    if (!this.searchQuery) return;
    
    this.isLoading = true;
    try {
      await this.geocodeAddress(this.searchQuery);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  // Convertir adresse en coordonnées (geocoding)
  async geocodeAddress(address: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        this.updateLocation(parseFloat(lat), parseFloat(lon), display_name);
        this.searchQuery = display_name.split(',')[0];
      } else {
        console.warn('Aucun résultat trouvé');
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
    }
  }
  
  // Convertir coordonnées en adresse (reverse geocoding)
  async reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.display_name) {
        this.updateLocation(lat, lng, data.display_name);
      }
    } catch (error) {
      console.error('Erreur de reverse géocodage:', error);
    }
  }
  
  // Mettre à jour la carte et le marqueur
  updateLocation(lat: number, lng: number, address: string) {
    // Centrer la carte
    this.map.setView([lat, lng], 15);
    
    // Supprimer l'ancien marqueur
    if (this.marker) {
      this.marker.remove();
    }
    
    // Créer un nouveau marqueur
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.marker.bindPopup(`
      <b>📍 Selected Location</b><br>
      ${address.substring(0, 100)}...
    `).openPopup();
    
    // Formater l'adresse
    const parts = address.split(',');
    this.selectedName = parts[0].trim();
    this.selectedAddress = parts.slice(1, 4).join(',').trim();
    
    // Émettre l'événement
    this.locationSelected.emit(address);
  }
  
  // Effacer la sélection
  clearLocation() {
    this.selectedAddress = '';
    this.selectedName = '';
    this.searchQuery = '';
    
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    
    this.locationSelected.emit('');
  }
}