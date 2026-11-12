import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import {
  CurrencyCode,
  TransportType,
  mapDestinationCountryToCurrency
} from '../models/travel-plan.model';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface RouteEstimateResult {
  distanceKm: number;
  durationHours: number;
  durationMinutes: number;
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class RouteEstimatorService {
  private readonly geocodeUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly osrmBaseUrl = 'https://router.project-osrm.org/route/v1';

  constructor(private readonly http: HttpClient) {}

  geocodeCity(cityName: string): Observable<GeocodeResult | null> {
    const query = String(cityName ?? '').trim();
    if (!query) {
      return of(null);
    }

    const params = new HttpParams()
      .set('q', query)
      .set('format', 'json')
      .set('limit', '1');

    const headers = new HttpHeaders({ Accept: 'application/json' });

    return this.http.get<unknown[]>(this.geocodeUrl, { params, headers }).pipe(
      map((results) => this.normalizeGeocodeResult(results)),
      catchError(() => of(null))
    );
  }

  calculateRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    transport: TransportType
  ): Observable<RouteEstimateResult> {
    const endpoint = `${this.osrmBaseUrl}/driving/${originLng},${originLat};${destLng},${destLat}`;
    const params = new HttpParams().set('overview', 'false');

    return this.http.get<unknown>(endpoint, { params }).pipe(
      map((payload) => this.normalizeRoutePayload(payload, originLat, originLng, destLat, destLng, transport)),
      catchError(() => of(this.buildFallbackResult(originLat, originLng, destLat, destLng, transport)))
    );
  }

  calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    return Number(distance.toFixed(2));
  }

  estimateHoursFallback(distanceKm: number, transport: TransportType): number {
    const speedByTransport: Record<TransportType, number> = {
      CAR: 90,
      TRAIN: 150,
      PLANE: 750,
      BUS: 70
    };

    const speed = speedByTransport[transport] ?? speedByTransport['CAR'];
    if (speed <= 0) {
      return 0;
    }

    const hours = distanceKm / speed;
    return Number(hours.toFixed(2));
  }

  estimateCost(distanceKm: number, transport: string): number {
    const rates: Record<string, number> = {
      CAR: 0.12,
      BUS: 0.08,
      TRAIN: 0.15,
      PLANE: 0.25
    };

    const rate = rates[transport] ?? 0.12;
    return Math.round(distanceKm * rate);
  }

  getCurrencyForCountry(country: string): CurrencyCode {
    return mapDestinationCountryToCurrency(country);
  }

  private normalizeGeocodeResult(results: unknown[]): GeocodeResult | null {
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const first = (results[0] ?? {}) as Record<string, unknown>;
    const lat = Number(first['lat']);
    const lng = Number(first['lon']);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }

    return {
      lat,
      lng,
      displayName: String(first['display_name'] ?? '').trim() || 'Unknown location'
    };
  }

  private normalizeRoutePayload(
    payload: unknown,
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    transport: TransportType
  ): RouteEstimateResult {
    const route = this.extractFirstRoute(payload);
    if (!route) {
      return this.buildFallbackResult(originLat, originLng, destLat, destLng, transport);
    }

    const distanceMeters = Number(route['distance'] ?? 0);
    const durationSeconds = Number(route['duration'] ?? 0);

    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const durationHours = Number((durationSeconds / 3600).toFixed(2));
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    return {
      distanceKm,
      durationHours,
      durationMinutes,
      summary: `${distanceKm} km route estimated in about ${durationHours}h via ${transport.toLowerCase()}`
    };
  }

  private extractFirstRoute(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const response = payload as Record<string, unknown>;
    const routes = response['routes'];

    if (!Array.isArray(routes) || routes.length === 0) {
      return null;
    }

    const first = routes[0];
    if (!first || typeof first !== 'object') {
      return null;
    }

    return first as Record<string, unknown>;
  }

  private buildFallbackResult(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    transport: TransportType
  ): RouteEstimateResult {
    const distanceKm = this.calculateDistanceKm(originLat, originLng, destLat, destLng);
    const durationHours = this.estimateHoursFallback(distanceKm, transport);
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));

    return {
      distanceKm,
      durationHours,
      durationMinutes,
      summary: `${distanceKm} km estimated in about ${durationHours}h via ${transport.toLowerCase()}`
    };
  }

  private toRadians(value: number): number {
    return value * (Math.PI / 180);
  }
}
