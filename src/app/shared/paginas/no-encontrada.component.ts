import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrada',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="pagina-estado">
      <svg class="icono" aria-hidden="true" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="19" />
        <path d="M18 18a6 6 0 1 1 9.5 4.8c-2.2 1.5-3.5 2.4-3.5 5.2m0 7h.02" />
      </svg>
      <h1>Página no encontrada</h1>
      <p>La dirección solicitada no existe.</p>
      <a routerLink="/login">Ir al inicio</a>
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
        color: var(--color-informacion);
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
export class NoEncontradaComponent {}
