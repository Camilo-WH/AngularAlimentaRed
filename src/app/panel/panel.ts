import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-panel',
  template: `
    <header class="barra">
      <strong>AlimentaRed · Panel administrativo</strong>
      <span class="usuario">
        {{ auth.usuario()?.nombre }} ({{ auth.usuario()?.rol }})
        <button type="button" (click)="auth.logout()">Cerrar sesión</button>
      </span>
    </header>

    <main class="contenido">
      <h2>Bienvenido</h2>
      <p>Aquí irán las secciones: usuarios, organizaciones, categorías y parámetros.</p>
    </main>
  `,
  styles: [
    `
      .barra {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        border-bottom: 1px solid var(--color-borde);
        background: var(--color-superficie);
        color: var(--color-texto);
        font-family: var(--fuente-texto);
      }
      .usuario button {
        margin-left: 12px;
        padding: 6px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: transparent;
        color: var(--color-texto);
        cursor: pointer;
      }
      .contenido {
        padding: 24px;
        font-family: var(--fuente-texto);
      }
    `,
  ],
})
export class Panel {
  readonly auth = inject(AuthService);
}