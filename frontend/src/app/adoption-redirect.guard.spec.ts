import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { adoptionRedirectGuard } from './adoption-redirect.guard';

describe('adoptionRedirectGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => adoptionRedirectGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
