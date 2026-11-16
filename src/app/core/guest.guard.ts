import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, rutaPanelPorRol } from './auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    return true;
  }

  const destino = rutaPanelPorRol(auth.usuario()?.rol ?? null);
  return router.createUrlTree([destino ?? '/acceso-denegado']);
};
