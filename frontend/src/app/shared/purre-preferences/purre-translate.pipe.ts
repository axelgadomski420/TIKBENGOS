/**
 * Translation lookup for the current PURRE locale.
 * Impure by design: HttpClient updates the catalog asynchronously after app startup.
 */
import { Pipe, PipeTransform } from '@angular/core';
import { PurreI18nService } from './purre-i18n.service';

@Pipe({ name: 'purreTranslate', pure: false })
export class PurreTranslatePipe implements PipeTransform {
  constructor(private readonly i18n: PurreI18nService) {}

  transform(key: string): string {
    return this.i18n.text(key);
  }
}
