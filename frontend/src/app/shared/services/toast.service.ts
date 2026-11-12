// src/app/shared/services/toast.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  success(message: string): void {
    console.log('✅ Success:', message);
    // Vous pouvez utiliser alert ou un snackbar
    alert(message);
  }

  error(message: string): void {
    console.error('❌ Error:', message);
    alert(message);
  }

  warning(message: string): void {
    console.warn('⚠️ Warning:', message);
    alert(message);
  }

  info(message: string): void {
    console.info('ℹ️ Info:', message);
    alert(message);
  }
}