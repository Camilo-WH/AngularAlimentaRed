import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { EnlaceMenu } from '../../core/modelos';
import { LogoMarcaComponent } from '../../shared/marca/logo-marca.component';
import { BotonTemaComponent } from '../../shared/tema/boton-tema.component';

@Component({
  selector: 'app-layout-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LogoMarcaComponent, BotonTemaComponent],
  template: `
    <div class="marco">
      <aside class="lateral">
        <a class="marca" routerLink="/admin" aria-label="AlimentaRed, inicio de administración">
          <app-logo-marca tamano="pequeno" />
          <span class="rol-marca">Administración</span>
        </a>
        <nav class="menu" aria-label="Menú de administración">
          @for (enlace of menu; track enlace.ruta) {
            <a
              [routerLink]="['/admin', enlace.ruta]"
              routerLinkActive="activo"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
            >
              {{ enlace.titulo }}
            </a>
          }
        </nav>
      </aside>
      <section class="principal">
        <header class="barra">
          <div class="identidad">
            <strong>{{ auth.usuario()?.nombre ?? 'Usuario' }}</strong>
            <span class="rol">Administrador</span>
          </div>
          <div class="acciones">
            <app-boton-tema />
            <button class="salir" type="button" (click)="auth.logout()">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
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
        color: var(--color-texto);
        font-family: var(--fuente-texto);
      }
      .marco {
        display: flex;
        min-height: 100vh;
        background: var(--color-fondo);
      }
      .lateral {
        position: sticky;
        top: 0;
        display: flex;
        width: 276px;
        height: 100vh;
        height: 100svh;
        flex: 0 0 276px;
        flex-direction: column;
        overflow-y: auto;
        padding: 26px 16px;
        background: var(--color-panel-marca);
        color: var(--color-panel-marca-texto);
      }
      .marca {
        display: grid;
        justify-items: start;
        gap: 12px;
        padding: 0 10px 24px;
        border-bottom: 1px solid color-mix(in srgb, var(--color-panel-marca-texto) 18%, transparent);
        color: inherit;
        text-decoration: none;
      }
      .rol-marca {
        padding: 5px 9px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--color-panel-marca-texto) 10%, transparent);
        color: var(--color-panel-marca-suave);
        font-size: var(--texto-xs);
        font-weight: var(--peso-semibold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .menu {
        display: grid;
        gap: 6px;
        margin-top: 24px;
      }
      .menu a {
        display: flex;
        min-height: 44px;
        align-items: center;
        padding: 10px 12px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        color: var(--color-panel-marca-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-medio);
        text-decoration: none;
        transition:
          background-color var(--transicion-base),
          color var(--transicion-base);
      }
      .menu a:hover {
        background: color-mix(in srgb, var(--color-panel-marca-texto) 11%, transparent);
      }
      .menu a.activo {
        background: var(--color-panel-marca-acento);
        color: var(--color-panel-marca);
        font-weight: var(--peso-bold);
      }
      .principal {
        min-width: 0;
        flex: 1;
        background: var(--color-fondo);
      }
      .barra {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        min-height: 76px;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 12px clamp(24px, 3vw, 48px);
        border-bottom: 1px solid var(--color-borde);
        background: var(--color-superficie);
      }
      .identidad {
        display: grid;
        gap: 2px;
      }
      .identidad strong {
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
        font-size: var(--texto-base);
        font-weight: var(--peso-bold);
      }
      .rol {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
      }
      .acciones {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .salir {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
        cursor: pointer;
        transition:
          background-color var(--transicion-base),
          border-color var(--transicion-base);
      }
      .salir:hover {
        border-color: var(--color-texto-secundario);
        background: var(--color-superficie-hover);
      }
      .salir svg {
        width: 17px;
        height: 17px;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .contenido {
        max-width: 1800px;
        margin-inline: auto;
        padding: 32px clamp(24px, 3vw, 48px);
      }
      @media (max-width: 760px) {
        .marco {
          display: block;
        }
        .lateral {
          padding: 12px;
        }
        .menu {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          margin-top: 12px;
        }
        .barra {
          position: static;
          flex-wrap: wrap;
          padding: 16px;
        }
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
