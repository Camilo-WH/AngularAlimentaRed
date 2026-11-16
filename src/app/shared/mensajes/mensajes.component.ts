import { Component, inject } from '@angular/core';
import { MensajesService } from './mensajes.service';

@Component({
  selector: 'app-mensajes',
  standalone: true,
  template: `
    <aside class="mensajes" aria-live="polite">
      @for (mensaje of servicio.mensajes(); track mensaje.id) {
        <div class="mensaje" [class.exito]="mensaje.tipo === 'exito'" [class.error]="mensaje.tipo === 'error'">
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
      }
      .mensaje {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 8px;
        color: #fff;
        box-shadow: 0 4px 14px #0002;
      }
      .exito {
        background: #237a3b;
      }
      .error {
        background: #ad3030;
      }
      button {
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 20px;
        cursor: pointer;
      }
    `,
  ],
})
export class MensajesComponent {
  readonly servicio = inject(MensajesService);
}
