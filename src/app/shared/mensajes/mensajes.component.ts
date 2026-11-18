import { Component, inject } from '@angular/core';
import { MensajesService } from './mensajes.service';

@Component({
  selector: 'app-mensajes',
  standalone: true,
  template: `
    <aside class="mensajes" aria-live="polite">
      @for (mensaje of servicio.mensajes(); track mensaje.id) {
        <div class="mensaje" [class.exito]="mensaje.tipo === 'exito'" [class.error]="mensaje.tipo === 'error'">
          <svg class="icono" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            @if (mensaje.tipo === 'exito') {
              <path d="m5 12 4 4L19 6" />
            } @else {
              <path d="m7 7 10 10M17 7 7 17" />
              <circle cx="12" cy="12" r="9" />
            }
          </svg>
          <span>{{ mensaje.texto }}</span>
          <button type="button" aria-label="Cerrar mensaje" (click)="servicio.descartar(mensaje.id)">
            ×
          </button>
        </div>
      }
    </aside>
  `,
  styles: [
    `
      .mensajes {
        position: fixed;
        z-index: 1000;
        top: 16px;
        right: 16px;
        display: grid;
        gap: 8px;
        width: min(360px, calc(100vw - 32px));
        font-family: var(--fuente-texto);
      }
      .mensaje {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid var(--color-borde);
        border-left-width: 4px;
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }
      .exito {
        border-left-color: var(--color-exito);
        background: var(--color-exito-fondo);
        color: var(--color-exito);
      }
      .error {
        border-left-color: var(--color-error);
        background: var(--color-error-fondo);
        color: var(--color-error);
      }
      .icono {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .mensaje span {
        flex: 1;
      }
      button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
      }
      button:hover {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }
    `,
  ],
})
export class MensajesComponent {
  readonly servicio = inject(MensajesService);
}
