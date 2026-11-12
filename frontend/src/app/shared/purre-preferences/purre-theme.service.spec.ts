import { TestBed } from '@angular/core/testing';
import { PurreThemeService } from './purre-theme.service';

describe('PurreThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses PURRE AURA as the default theme', () => {
    TestBed.configureTestingModule({ providers: [PurreThemeService] });
    const service = TestBed.inject(PurreThemeService);
    expect(service.theme).toBe('purre-aura');
    expect(document.documentElement.dataset['theme']).toBe('purre-aura');
  });

  it('persists and applies a selected theme', () => {
    TestBed.configureTestingModule({ providers: [PurreThemeService] });
    const service = TestBed.inject(PurreThemeService);
    service.setTheme('purre-forest');
    expect(localStorage.getItem('purre.theme')).toBe('purre-forest');
    expect(document.documentElement.dataset['theme']).toBe('purre-forest');
  });

  it('uses the system preference when selected', () => {
    TestBed.configureTestingModule({ providers: [PurreThemeService] });
    const service = TestBed.inject(PurreThemeService);
    service.setTheme('system');
    expect(localStorage.getItem('purre.theme')).toBe('system');
    expect(['purre-light', 'purre-aura']).toContain(document.documentElement.dataset['theme']);
  });
});
