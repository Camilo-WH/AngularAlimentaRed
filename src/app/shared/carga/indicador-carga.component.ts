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
        background: #ffffffb8;
        color: #24352a;
        font: 500 15px system-ui, sans-serif;
      }
      .rueda {
        width: 24px;
        height: 24px;
        border: 3px solid #cfe0d2;
        border-top-color: #287a3d;
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
