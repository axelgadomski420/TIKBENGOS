import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurreI18nService, PurreLocale } from './purre-i18n.service';
import { PurreTheme, PurreThemeService } from './purre-theme.service';

@Component({
  selector: 'app-purre-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purre-preferences.component.html'
})
export class PurrePreferencesComponent {
  isOpen = false;
  readonly locales: { value: PurreLocale; label: string }[] = [
    { value: 'pl', label: 'Polski' }, { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' }, { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' }, { value: 'it', label: 'Italiano' },
    { value: 'uk', label: 'Українська' }
  ];
  readonly themes = [
    { value: 'purre-aura', key: 'theme.aura' },
    { value: 'purre-light', key: 'theme.light' },
    { value: 'purre-midnight', key: 'theme.midnight' },
    { value: 'purre-forest', key: 'theme.forest' },
    { value: 'purre-royal', key: 'theme.royal' },
    { value: 'purre-sunset', key: 'theme.sunset' },
    { value: 'purre-mono', key: 'theme.mono' },
    { value: 'purre-high-contrast', key: 'theme.highContrast' },
    { value: 'system', key: 'preferences.system' }
  ] as const;

  constructor(readonly i18n: PurreI18nService, private readonly themesService: PurreThemeService) {}

  get locale(): PurreLocale { return this.i18n.locale; }
  get theme(): PurreTheme { return this.themesService.theme; }
  t(key: string): string { return this.i18n.text(key); }
  changeLocale(locale: PurreLocale): void { this.i18n.setLocale(locale); }
  changeTheme(theme: PurreTheme): void { this.themesService.setTheme(theme); }
}
