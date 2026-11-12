import { Injectable } from '@angular/core';

export const PURRE_THEMES = [
  'purre-aura', 'purre-light', 'purre-midnight', 'purre-forest',
  'purre-royal', 'purre-sunset', 'purre-mono', 'purre-high-contrast'
] as const;

export type PurreTheme = typeof PURRE_THEMES[number] | 'system';

@Injectable({ providedIn: 'root' })
export class PurreThemeService {
  private readonly storageKey = 'purre.theme';
  private mediaQuery?: MediaQueryList;
  private readonly onSystemThemeChange = (): void => {
    if (this.selectedTheme === 'system') this.apply(this.systemTheme());
  };
  private selectedTheme: PurreTheme = 'purre-aura';

  constructor() {
    this.mediaQuery = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: light)')
      : undefined;
    try {
      const saved = localStorage.getItem(this.storageKey) as PurreTheme | null;
      if (saved === 'system' || (saved && PURRE_THEMES.includes(saved as typeof PURRE_THEMES[number]))) {
        this.selectedTheme = saved;
      }
    } catch { /* Keep the premium dark default when storage is unavailable. */ }
    this.mediaQuery?.addEventListener('change', this.onSystemThemeChange);
    this.apply(this.selectedTheme === 'system' ? this.systemTheme() : this.selectedTheme);
  }

  get theme(): PurreTheme { return this.selectedTheme; }

  setTheme(theme: PurreTheme): void {
    if (theme !== 'system' && !PURRE_THEMES.includes(theme as typeof PURRE_THEMES[number])) return;
    this.selectedTheme = theme;
    try { localStorage.setItem(this.storageKey, theme); } catch { /* Storage may be disabled. */ }
    this.apply(theme === 'system' ? this.systemTheme() : theme);
  }

  private systemTheme(): PurreTheme {
    return this.mediaQuery?.matches ? 'purre-light' : 'purre-aura';
  }

  private apply(theme: PurreTheme): void {
    if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = theme;
  }
}
