import { Component, inject } from '@angular/core';
import { TemaService } from '../../core/tema.service';

@Component({
  selector: 'app-boton-tema',
  standalone: true,
  template: `
    <button
      class="boton-tema"
      type="button"
      [attr.aria-label]="
        'Cambiar al modo ' +
        (tema.esOscuro() ? 'claro' : 'oscuro') +
        '. Modo actual: ' +
        tema.tema()
      "
      [attr.aria-pressed]="tema.esOscuro()"
      (click)="tema.alternar()"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @if (tema.esOscuro()) {
          <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />
        } @else {
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        }
      </svg>
      <span>Modo {{ tema.tema() }}</span>
    </button>
  `,
  styles: [
    `
      .boton-tema {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        justify-content: center;
        gap: 9px;
        padding: 8px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        color: var(--color-texto);
        font-family: var(--fuente-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
        cursor: pointer;
        transition:
          background-color var(--transicion-base),
          border-color var(--transicion-base),
          color var(--transicion-base);
      }

      .boton-tema:hover {
        background: var(--color-superficie-hover);
      }

      svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
      }
    `,
  ],
})
export class BotonTemaComponent {
  readonly tema = inject(TemaService);
}
