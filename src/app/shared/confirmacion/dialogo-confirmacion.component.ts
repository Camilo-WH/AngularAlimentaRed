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
        background: #0008;
      }
      .dialogo {
        width: min(440px, 100%);
        padding: 24px;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 16px 48px #0003;
      }
      h2 {
        margin-top: 0;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
      button {
        padding: 9px 14px;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
      }
      .secundario {
        background: #e5e7eb;
      }
      .confirmar {
        background: #287a3d;
        color: #fff;
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
