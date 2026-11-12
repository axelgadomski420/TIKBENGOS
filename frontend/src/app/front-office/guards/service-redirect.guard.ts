import { CanActivateFn } from '@angular/router';

export const serviceRedirectGuard: CanActivateFn = (route, state) => {
  return true;
};
