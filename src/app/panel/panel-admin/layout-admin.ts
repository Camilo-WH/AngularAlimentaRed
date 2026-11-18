import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { EnlaceMenu } from '../../core/modelos';

@Component({
  selector: 'app-layout-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="marco">
      <aside class="lateral">
        <a class="marca" routerLink="/admin">AlimentaRed <small>Administración</small></a>
        <nav aria-label="Menú de administración">
          @for (enlace of menu; track enlace.ruta) {
            <a
              [routerLink]="['/admin', enlace.ruta]"
              routerLinkActive="activo"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ enlace.titulo }}
            </a>
          }
        </nav>
      </aside>
      <section class="principal">
        <header class="barra">
          <div>
            <strong>{{ auth.usuario()?.nombre ?? 'Usuario' }}</strong>
            <span>Administrador</span>
          </div>
          <button type="button" (click)="auth.logout()">Cerrar sesión</button>
        </header>
        <main class="contenido"><router-outlet /></main>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        color: #233329;
        font-family: system-ui, sans-serif;
      }
      .marco {
        display: flex;
        min-height: 100vh;
      }
      .lateral {
        flex: 0 0 270px;
        padding: 22px 14px;
        background: #193d29;
        color: #fff;
      }
      .marca {
        display: grid;
        gap: 4px;
        padding: 0 12px 24px;
        color: inherit;
        font-size: 20px;
        font-weight: 700;
        text-decoration: none;
      }
      .marca small {
        color: #bdd3c3;
        font-size: 12px;
        font-weight: 400;
      }
      nav {
        display: grid;
        gap: 4px;
      }
      nav a {
        padding: 10px 12px;
        border-radius: 7px;
        color: #e7f0e9;
        font-size: 14px;
        text-decoration: none;
      }
      nav a:hover,
      nav a.activo {
        background: #2e6843;
        color: #fff;
      }
      .principal {
        min-width: 0;
        flex: 1;
        background: #f5f7f5;
      }
      .barra {
        display: flex;
        min-height: 68px;
        align-items: center;
        justify-content: space-between;
        padding: 12px 28px;
        border-bottom: 1px solid #e1e7e2;
        background: #fff;
      }
      .barra div {
        display: grid;
        gap: 3px;
      }
      .barra span {
        color: #657369;
        font-size: 13px;
      }
      button {
        padding: 9px 13px;
        border: 1px solid #cbd6ce;
        border-radius: 7px;
        background: #fff;
        color: #24352a;
        cursor: pointer;
      }
      .contenido {
        padding: 28px;
      }
      @media (max-width: 760px) {
        .marco {
          display: block;
        }
        .lateral {
          padding: 12px;
        }
        nav {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }
        .barra,
        .contenido {
          padding: 16px;
        }
      }
    `,
  ],
})
export class LayoutAdmin {
  readonly auth = inject(AuthService);
  readonly menu: EnlaceMenu[] = [
    { ruta: 'reglas', titulo: 'Parametrizar reglas' },
    { ruta: 'categorias', titulo: 'Gestionar categorías' },
    { ruta: 'organizaciones', titulo: 'Consultar organizaciones' },
    { ruta: 'verificar-organizacion', titulo: 'Verificar organización' },
    { ruta: 'registrar-organizacion', titulo: 'Registrar organización' },
    { ruta: 'cuentas', titulo: 'Suspender o reactivar cuenta' },
    { ruta: 'usuarios-roles', titulo: 'Gestionar usuarios y roles' },
  ];
}
