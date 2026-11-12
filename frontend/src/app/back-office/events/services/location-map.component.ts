// location-map.component.ts
import { Component, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-map',
  template: `
    <div class="location-map-container">
      <div class="search-bar">
        <div class="aef-input-with-icon">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            class="aef-input aef-input--icon"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchLocation()"
            placeholder="Search for a location...">
          <button class="search-btn" (click)="searchLocation()">
            <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <div id="map" class="map-container"></div>

      <div class="location-info" *ngIf="selectedAddress">
        <div class="location-info__icon">
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <div class="location-info__content">
          <div class="location-info__title">{{ selectedName }}</div>
          <div class="location-info__address">{{ selectedAddress }}</div>
        </div>
        <button class="location-info__clear" (click)="clearLocation()">
          <i class="fas fa-times"></i>
        </button>
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
      z-index: 1;
      color: #9ca3af;
    }
    .search-bar .aef-input {
      padding-right: 3.5rem;
      padding-left: 2.5rem;
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
      background: #eff6ff;
      border-radius: 0.75rem;
      border: 1px solid #bfdbfe;
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
  
  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 100);
  }
  
  private initMap() {
    this.map = L.map('map').setView([33.5731, -7.5898], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    
    this.map.on('click', (e: any) => {
      this.reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
    
    if (this.initialLocation) {
      this.geocodeAddress(this.initialLocation);
    }
  }
  
  async searchLocation() {
    if (this.searchQuery) {
      await this.geocodeAddress(this.searchQuery);
    }
  }
  
  async geocodeAddress(address: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      this.updateLocation(parseFloat(lat), parseFloat(lon), display_name);
      this.searchQuery = display_name.split(',')[0];
    }
  }
  
  async reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.display_name) {
      this.updateLocation(lat, lng, data.display_name);
    }
  }
  
  updateLocation(lat: number, lng: number, address: string) {
    this.map.setView([lat, lng], 15);
    
    if (this.marker) {
      this.marker.remove();
    }
    
    this.marker = L.marker([lat, lng]).addTo(this.map);
    this.marker.bindPopup(address.substring(0, 100)).openPopup();
    
    const parts = address.split(',');
    this.selectedName = parts[0].trim();
    this.selectedAddress = parts.slice(1, 4).join(',').trim();
    
    this.locationSelected.emit(address);
  }
  
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