import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GifResult {
  id: string;
  title: string;
  gifUrl: string;
  previewUrl: string;
}

@Injectable({ providedIn: 'root' })
export class GifService {
  private readonly api = environment.communityGifsApiUrl;

  constructor(private http: HttpClient) {}

  search(query: string, limit = 36): Observable<GifResult[]> {
    const trimmedQuery = query.trim();
    const params = new HttpParams()
      .set('q', trimmedQuery)
      .set('limit', String(limit));

    return this.http.get<GifResult[]>(`${this.api}/search`, { params });
  }
}
