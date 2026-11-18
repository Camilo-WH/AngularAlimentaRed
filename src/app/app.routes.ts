import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';
import { Login } from './login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./panel/panel-admin/layout-admin').then((modulo) => modulo.LayoutAdmin),
    canActivate: [authGuard],
    data: { rol: 'ADMINISTRADOR' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reglas' },
      {
        path: 'reglas',
        loadComponent: () =>
          import('./panel/panel-admin/reglas/parametrizar-reglas').then(
            (modulo) => modulo.ParametrizarReglas,
          ),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./panel/panel-admin/categorias/gestionar-categorias').then(
            (modulo) => modulo.GestionarCategorias,
          ),
      },
      {
        path: 'organizaciones',
        loadComponent: () =>
          import('./panel/panel-admin/organizaciones/consultar-organizaciones').then(
            (modulo) => modulo.ConsultarOrganizaciones,
          ),
      },
      {
        path: 'verificar-organizacion',
        loadComponent: () =>
          import('./panel/panel-admin/verificar-organizacion/verificar-organizacion').then(
            (modulo) => modulo.VerificarOrganizacion,
          ),
      },
      {
        path: 'registrar-organizacion',
        loadComponent: () =>
          import('./panel/panel-admin/registrar-organizacion/registrar-organizacion').then(
            (modulo) => modulo.RegistrarOrganizacion,
          ),
      },
      {
        path: 'cuentas',
        loadComponent: () =>
          import('./panel/panel-admin/cuentas/gestionar-cuentas').then(
            (modulo) => modulo.GestionarCuentas,
          ),
      },
      {
        path: 'usuarios-roles',
        loadComponent: () =>
          import('./panel/panel-admin/usuarios-roles/gestionar-usuarios-roles').then(
            (modulo) => modulo.GestionarUsuariosRoles,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/paginas/no-encontrada.component').then(
            (modulo) => modulo.NoEncontradaComponent,
          ),
      },
    ],
  },
  {
    path: 'coordinador',
    loadComponent: () =>
      import('./panel/panel-coordinador/layout-coordinador').then(
        (modulo) => modulo.LayoutCoordinador,
      ),
    canActivate: [authGuard],
    data: { rol: 'COORDINADOR' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'indicadores' },
      {
        path: 'indicadores',
        loadComponent: () =>
          import('./panel/panel-coordinador/indicadores/consultar-indicadores').then(
            (modulo) => modulo.ConsultarIndicadores,
          ),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./panel/panel-coordinador/historial/consultar-historial').then(
            (modulo) => modulo.ConsultarHistorial,
          ),
      },
      {
        path: 'apelaciones',
        loadComponent: () =>
          import('./panel/panel-coordinador/apelaciones/evaluar-apelacion').then(
            (modulo) => modulo.EvaluarApelacion,
          ),
      },
      {
        path: 'incidencias',
        loadComponent: () =>
          import('./panel/panel-coordinador/incidencias/gestionar-incidencias').then(
            (modulo) => modulo.GestionarIncidencias,
          ),
      },
      {
        path: 'asignaciones-entregas',
        loadComponent: () =>
          import('./panel/panel-coordinador/asignaciones-entregas/consultar-asignaciones-entregas').then(
            (modulo) => modulo.ConsultarAsignacionesEntregas,
          ),
      },
      {
        path: 'liberar-sobrante',
        loadComponent: () =>
          import('./panel/panel-coordinador/liberar-sobrante/liberar-sobrante').then(
            (modulo) => modulo.LiberarSobrante,
          ),
      },
      {
        path: 'confirmar-salida',
        loadComponent: () =>
          import('./panel/panel-coordinador/confirmar-salida/confirmar-salida').then(
            (modulo) => modulo.ConfirmarSalida,
          ),
      },
      {
        path: 'resolver-solicitud',
        loadComponent: () =>
          import('./panel/panel-coordinador/resolver-solicitud/resolver-solicitud').then(
            (modulo) => modulo.ResolverSolicitud,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/paginas/no-encontrada.component').then(
            (modulo) => modulo.NoEncontradaComponent,
          ),
      },
    ],
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./shared/paginas/acceso-denegado.component').then(
        (modulo) => modulo.AccesoDenegadoComponent,
      ),
  },
  {
    path: 'no-encontrada',
    loadComponent: () =>
      import('./shared/paginas/no-encontrada.component').then(
        (modulo) => modulo.NoEncontradaComponent,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'organizaciones' },
  { path: '**', redirectTo: 'no-encontrada' },
];