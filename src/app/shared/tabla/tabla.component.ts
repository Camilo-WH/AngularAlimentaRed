import { Component, computed, input, signal } from '@angular/core';
import { ColumnaTabla } from '../../core/modelos';

@Component({
  selector: 'app-tabla',
  standalone: true,
  template: `
    <div class="contenedor">
      <table>
        <thead>
          <tr>
            @for (columna of columnas(); track columna.titulo) {
              <th scope="col">{{ columna.titulo }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @if (filas().length === 0) {
            <tr>
              <td class="vacio" [attr.colspan]="columnas().length || 1">{{ textoVacio() }}</td>
            </tr>
          } @else {
            @for (fila of filasPagina(); track $index) {
              <tr>
                @for (columna of columnas(); track columna.titulo) {
                  <td>{{ valor(fila, columna.clave) }}</td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
      @if (filas().length > tamanoPagina()) {
        <nav class="paginacion" aria-label="Paginación de la tabla">
          <button type="button" [disabled]="pagina() === 1" (click)="anterior()">Anterior</button>
          <span>Página {{ pagina() }} de {{ totalPaginas() }}</span>
          <button
            type="button"
            [disabled]="pagina() >= totalPaginas()"
            (click)="siguiente()"
          >
            Siguiente
          </button>
        </nav>
      }
    </div>
  `,
  styles: [
    `
      .contenedor {
        overflow-x: auto;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-family: var(--fuente-texto);
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--color-borde);
      }
      th {
        background: var(--color-superficie-secundaria);
        color: var(--color-texto);
        font-weight: var(--peso-semibold);
      }
      tbody tr:hover {
        background: var(--color-superficie-hover);
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      .vacio {
        padding: 28px;
        color: var(--color-texto-secundario);
        text-align: center;
      }
      .paginacion {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        padding: 10px 12px;
        color: var(--color-texto-secundario);
      }
      button {
        padding: 7px 10px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie);
        color: var(--color-texto);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--color-superficie-hover);
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
    `,
  ],
})
export class TablaComponent<T extends object> {
  readonly filas = input<readonly T[]>([]);
  readonly columnas = input<readonly ColumnaTabla<T>[]>([]);
  readonly tamanoPagina = input(10);
  readonly textoVacio = input('No hay datos para mostrar.');
  readonly pagina = signal(1);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filas().length / Math.max(1, this.tamanoPagina()))),
  );
  readonly filasPagina = computed(() => {
    const tamano = Math.max(1, this.tamanoPagina());
    const inicio = (this.pagina() - 1) * tamano;
    return this.filas().slice(inicio, inicio + tamano);
  });

  /** Devuelve el valor de una celda como texto, sin depender del tipo de la fila. */
  valor(fila: T, clave: ColumnaTabla<T>['clave']): string {
    const dato = (fila as unknown as Record<string, unknown>)[String(clave)];
    if (dato === null || dato === undefined) {
      return '';
    }
    return typeof dato === 'boolean' ? (dato ? 'Sí' : 'No') : String(dato);
  }

  anterior(): void {
    this.pagina.update((pagina) => Math.max(1, pagina - 1));
  }

  siguiente(): void {
    this.pagina.update((pagina) => Math.min(this.totalPaginas(), pagina + 1));
  }
}