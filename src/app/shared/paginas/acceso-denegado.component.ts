import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-acceso-denegado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="pagina-estado">
      <svg class="icono" aria-hidden="true" viewBox="0 0 48 48" fill="none">
        <path d="M24 5 43 40H5L24 5Z" />
        <path d="M24 17v10m0 7h.02" />
      </svg>
      <h1>Acceso denegado</h1>
      <p>Tu cuenta no tiene permiso para entrar a esta sección.</p>
      <a routerLink="/login">Volver al inicio de sesión</a>
    </main>
  `,
  styles: [
    `
      .pagina-estado {
        display: grid;
        justify-items: center;
        max-width: 600px;
        margin: 12vh auto;
        padding: clamp(28px, 5vw, 48px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        font-family: var(--fuente-texto);
        text-align: center;
        box-shadow: var(--sombra-tarjeta);
      }
      .icono {
        width: 52px;
        height: 52px;
        margin-bottom: 12px;
        color: var(--color-advertencia);
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      h1 {
        margin: 0 0 8px;
        font-family: var(--fuente-titulos);
      }
      p {
        margin: 0 0 20px;
        color: var(--color-texto-secundario);
      }
      a {
        color: var(--color-acento);
        font-weight: var(--peso-semibold);
      }
    `,
  ],
})
export class AccesoDenegadoComponent {}
