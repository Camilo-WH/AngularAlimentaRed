import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialogo-confirmacion',
  standalone: true,
  template: `
    @if (abierto()) {
      <div class="fondo" (click)="cancelado.emit()">
        <section
          class="dialogo"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="titulo()"
          (click)="$event.stopPropagation()"
        >
          <h2>{{ titulo() }}</h2>
          <p>{{ mensaje() }}</p>
          <footer>
            <button type="button" class="secundario" (click)="cancelado.emit()">
              {{ textoCancelar() }}
            </button>
            <button type="button" class="confirmar" (click)="confirmado.emit()">
              {{ textoConfirmar() }}
            </button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .fondo {
        position: fixed;
        z-index: 900;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 20px;
        background: color-mix(in srgb, var(--color-fondo) 78%, transparent);
        backdrop-filter: blur(4px);
      }
      .dialogo {
        width: min(440px, 100%);
        padding: 24px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      h2 {
        margin-top: 0;
        font-family: var(--fuente-titulos);
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
      button {
        min-height: 40px;
        padding: 9px 14px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        font-weight: var(--peso-semibold);
        cursor: pointer;
      }
      .secundario {
        border-color: var(--color-borde);
        background: var(--color-superficie-secundaria);
        color: var(--color-texto);
      }
      .confirmar {
        background: var(--color-acento);
        color: var(--color-acento-texto);
      }
      button:hover {
        filter: brightness(1.08);
      }
      @media (max-width: 420px) {
        footer {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class DialogoConfirmacionComponent {
  readonly abierto = input(false);
  readonly titulo = input('Confirmar acción');
  readonly mensaje = input('');
  readonly textoConfirmar = input('Confirmar');
  readonly textoCancelar = input('Cancelar');
  readonly confirmado = output<void>();
  readonly cancelado = output<void>();
}
