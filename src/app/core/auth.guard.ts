import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROLES_PANEL } from './modelos';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado() && auth.tieneRol(ROLES_PANEL)) {
    return true;
  }
  return router.createUrlTree(['/login']);
};