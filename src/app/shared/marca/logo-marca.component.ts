import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo-marca',
  standalone: true,
  template: `
    <div class="logo-marca" [class.logo-grande]="tamano() === 'grande'">
      <svg class="isotipo" aria-hidden="true" viewBox="0 0 52 52" fill="none">
        <circle cx="26" cy="26" r="25" fill="var(--color-panel-marca-acento)" />
        <path
          d="M37 13C24 14 15 21 15 31a9 9 0 0 0 9 9c10 0 16-10 13-27Z"
          fill="var(--color-panel-marca)"
        />
        <path d="M18 35 33 19m-8 9 1-8m3 2 7 1" stroke="var(--color-panel-marca-acento)" />
      </svg>
      <span class="texto-marca">
        <strong>AlimentaRed</strong>
        <small>Marca provisional</small>
      </span>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .logo-marca {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--color-panel-marca-texto);
      }

      .isotipo {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
      }

      .texto-marca {
        display: grid;
        gap: 1px;
      }

      strong {
        font-family: var(--fuente-titulos);
        font-size: var(--texto-lg);
        font-weight: var(--peso-bold);
        letter-spacing: -0.03em;
        line-height: 1.15;
      }

      small {
        color: var(--color-panel-marca-suave);
        font-size: var(--texto-xs);
        font-weight: var(--peso-medio);
        letter-spacing: 0.03em;
      }

      .logo-grande {
        gap: 16px;
      }

      .logo-grande .isotipo {
        width: 64px;
        height: 64px;
      }

      .logo-grande strong {
        font-size: clamp(1.75rem, 3.5vw, 2.5rem);
      }

      .logo-grande small {
        font-size: var(--texto-sm);
      }
    `,
  ],
})
export class LogoMarcaComponent {
  readonly tamano = input<'pequeno' | 'grande'>('pequeno');
}
