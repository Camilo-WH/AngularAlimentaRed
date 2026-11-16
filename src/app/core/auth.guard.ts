import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { RolPanel } from './modelos';

function esRolPanel(valor: unknown): valor is RolPanel {
  return valor === 'ADMINISTRADOR' || valor === 'COORDINADOR';
}

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  const rolEsperado = route.data['rol'];
  if (esRolPanel(rolEsperado) && auth.tieneRol([rolEsperado])) {
    return true;
  }
  return router.createUrlTree(['/acceso-denegado']);
};