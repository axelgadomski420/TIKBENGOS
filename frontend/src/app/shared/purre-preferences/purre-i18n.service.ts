import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type PurreLocale = 'pl' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'uk';
export type PurreMessages = Record<string, string>;

const SUPPORTED_LOCALES: PurreLocale[] = ['pl', 'en', 'de', 'es', 'fr', 'it', 'uk'];
const FALLBACK_MESSAGES: PurreMessages = {
  'preferences.open': 'Ustawienia wyglądu',
  'preferences.title': 'Twoje doświadczenie',
  'preferences.subtitle': 'Dopasuj PURRE PETS do siebie.',
  'preferences.language': 'Język aplikacji',
  'preferences.theme': 'Motyw',
  'preferences.close': 'Zamknij ustawienia',
  'preferences.saved': 'Zmiany zapisują się automatycznie',
  'preferences.system': 'Zgodny z urządzeniem',
  'preferences.brand': 'PURRE AURA',
  'preferences.privacy': 'Twoje ustawienia są przechowywane na tym urządzeniu.'
};

@Injectable({ providedIn: 'root' })
export class PurreI18nService {
  private localeValue: PurreLocale = 'pl';
  private messages: PurreMessages = FALLBACK_MESSAGES;
  readonly locale$ = new BehaviorSubject<PurreLocale>('pl');

  constructor(private readonly http: HttpClient) {
    this.localeValue = this.resolveInitialLocale();
    this.locale$.next(this.localeValue);
    this.setDocumentLocale(this.localeValue);
    this.loadMessages(this.localeValue);
  }

  get locale(): PurreLocale { return this.localeValue; }

  text(key: string): string {
    return this.messages[key] ?? FALLBACK_MESSAGES[key] ?? key;
  }

  setLocale(locale: PurreLocale): void {
    if (!SUPPORTED_LOCALES.includes(locale) || locale === this.localeValue) return;
    this.localeValue = locale;
    this.messages = FALLBACK_MESSAGES;
    this.locale$.next(locale);
    this.setDocumentLocale(locale);
    try { localStorage.setItem('purre.locale', locale); } catch { /* Storage may be disabled. */ }
    this.loadMessages(locale);
  }

  private loadMessages(locale: PurreLocale): void {
    this.http.get<PurreMessages>(`assets/i18n/${locale}.json`).subscribe({
      next: messages => { if (this.localeValue === locale) this.messages = messages; },
      error: () => { this.messages = FALLBACK_MESSAGES; }
    });
  }

  private resolveInitialLocale(): PurreLocale {
    try {
      const saved = localStorage.getItem('purre.locale');
      if (saved && SUPPORTED_LOCALES.includes(saved as PurreLocale)) return saved as PurreLocale;
    } catch { /* Use browser preference when storage is disabled. */ }
    const browserLocale = navigator.language?.slice(0, 2).toLowerCase();
    return SUPPORTED_LOCALES.includes(browserLocale as PurreLocale) ? browserLocale as PurreLocale : 'pl';
  }

  private setDocumentLocale(locale: PurreLocale): void {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }
}
