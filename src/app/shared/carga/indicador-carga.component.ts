import { Component, input } from '@angular/core';

@Component({
  selector: 'app-indicador-carga',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="fondo" role="status" aria-live="polite">
        <span class="rueda" aria-hidden="true"></span>
        <span>{{ texto() }}</span>
      </div>
    }
  `,
  styles: [
    `
      .fondo {
        position: fixed;
        z-index: 950;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: color-mix(in srgb, var(--color-fondo) 82%, transparent);
        color: var(--color-texto);
        font-family: var(--fuente-texto);
        font-size: var(--texto-base);
        font-weight: var(--peso-medio);
        backdrop-filter: blur(4px);
      }
      .rueda {
        width: 24px;
        height: 24px;
        border: 3px solid var(--color-borde);
        border-top-color: var(--color-acento);
        border-radius: 50%;
        animation: girar 0.8s linear infinite;
      }
      @keyframes girar {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class IndicadorCargaComponent {
  readonly visible = input(false);
  readonly texto = input('Cargando...');
}
