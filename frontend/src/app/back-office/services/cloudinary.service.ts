import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly CLOUD_NAME = 'drius9csi';
  private readonly UPLOAD_PRESET = 'elif_unsigned';
  private readonly UPLOAD_URL = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Upload an image file to Cloudinary and return the secure URL
   */
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.UPLOAD_PRESET);
    formData.append('folder', 'elif/services');

    return this.http.post<CloudinaryResponse>(this.UPLOAD_URL, formData).pipe(
      map(response => response.secure_url)
    );
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSizeMB = 5;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.' };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `Fichier trop volumineux. Maximum ${maxSizeMB}MB.` };
    }

    return { valid: true };
  }
}
