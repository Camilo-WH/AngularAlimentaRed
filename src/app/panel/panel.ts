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
        background: #2e7d32;
        color: #fff;
        font-family: system-ui, sans-serif;
      }
      .usuario button {
        margin-left: 12px;
        padding: 6px 12px;
        border: 1px solid #fff;
        border-radius: 6px;
        background: transparent;
        color: #fff;
        cursor: pointer;
      }
      .contenido {
        padding: 24px;
        font-family: system-ui, sans-serif;
      }
    `,
  ],
})
export class Panel {
  readonly auth = inject(AuthService);
}