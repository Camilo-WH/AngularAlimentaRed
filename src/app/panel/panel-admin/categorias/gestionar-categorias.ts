import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

interface CategoriaDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
}

interface CategoriaRequest {
  nombre: string;
  descripcion: string;
  unidadMedida: string;
}

@Component({
  selector: 'app-gestionar-categorias',
  imports: [ReactiveFormsModule],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Gestionar categorías</h2>
        <p class="resumen">Tipos de alimento que los donantes pueden elegir al publicar un lote.</p>
      </header>

      <form class="formulario" [formGroup]="form" (ngSubmit)="guardar()">
        <h3>{{ editandoId() === null ? 'Nueva categoría' : 'Editar categoría' }}</h3>

        <div class="campos">
          <label>
            Nombre
            <input type="text" formControlName="nombre" maxlength="100" />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <small class="error">Ingresa el nombre.</small>
            }
          </label>

          <label>
            Unidad de medida
            <input type="text" formControlName="unidadMedida" maxlength="20" list="unidades" />
            <datalist id="unidades">
              <option value="kg"></option>
              <option value="g"></option>
              <option value="l"></option>
              <option value="unidades"></option>
              <option value="porciones"></option>
            </datalist>
            @if (form.controls.unidadMedida.touched && form.controls.unidadMedida.invalid) {
              <small class="error">Ingresa la unidad, por ejemplo kg.</small>
            }
          </label>

          <label class="ancho">
            Descripción (opcional)
            <textarea formControlName="descripcion" rows="2" maxlength="300"></textarea>
          </label>
        </div>

        <div class="acciones">
          <button type="submit" [disabled]="guardando()">{{ textoBoton() }}</button>
          @if (editandoId() !== null) {
            <button type="button" class="secundario" (click)="cancelarEdicion()">Cancelar</button>
          }
        </div>
      </form>

      @if (cargando()) {
        <p class="estado">Cargando categorías... Si el servidor estaba inactivo, puede tardar hasta un minuto.</p>
      } @else if (categorias().length === 0) {
        <p class="estado">Aún no hay categorías creadas.</p>
      } @else {
        <div class="contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Unidad</th>
                <th scope="col">Descripción</th>
                <th scope="col"><span class="oculto">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (cat of categorias(); track cat.id) {
                <tr>
                  <td>{{ cat.nombre }}</td>
                  <td>{{ cat.unidadMedida }}</td>
                  <td>{{ cat.descripcion || '—' }}</td>
                  <td class="celda-acciones">
                    <button type="button" class="secundario" (click)="editar(cat)">Editar</button>
                    <button
                      type="button"
                      class="peligro"
                      [disabled]="eliminandoId() === cat.id"
                      (click)="eliminar(cat)"
                    >
                      {{ eliminandoId() === cat.id ? 'Eliminando...' : 'Eliminar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [
    `
      h2,
      h3 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .resumen,
      .estado {
        color: var(--color-texto-secundario);
      }
      .formulario {
        margin: 20px 0 28px;
        padding: clamp(18px, 2.5vw, 28px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      .campos {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin: 20px 0;
      }
      .ancho {
        grid-column: 1 / -1;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      input,
      textarea {
        width: 100%;
        min-height: 44px;
        padding: 10px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      .error {
        color: var(--color-error);
        font-size: var(--texto-sm);
      }
      .acciones {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      button {
        min-height: 40px;
        padding: 9px 16px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        background: var(--color-acento);
        color: var(--color-acento-texto);
        font-weight: var(--peso-semibold);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--color-acento-hover);
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .secundario {
        border-color: var(--color-borde);
        background: var(--color-superficie);
        color: var(--color-texto);
      }
      .peligro {
        background: var(--color-error);
        color: var(--color-error-fondo);
      }
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
        font-weight: var(--peso-semibold);
      }
      tbody tr:hover {
        background: var(--color-superficie-hover);
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      .celda-acciones {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      .oculto {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
      }
    `,
  ],
})
export class GestionarCategorias implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly categorias = signal<CategoriaDto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly eliminandoId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    unidadMedida: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]],
    descripcion: ['', Validators.maxLength(300)],
  });

  readonly textoBoton = computed(() => {
    if (this.guardando()) {
      return 'Guardando...';
    }
    return this.editandoId() === null ? 'Crear categoría' : 'Guardar cambios';
  });

  ngOnInit(): void {
    this.cargar();
  }

  editar(categoria: CategoriaDto): void {
    this.editandoId.set(categoria.id);
    this.form.setValue({
      nombre: categoria.nombre,
      unidadMedida: categoria.unidadMedida,
      descripcion: categoria.descripcion ?? '',
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const cuerpo: CategoriaRequest = {
      nombre: valores.nombre.trim(),
      unidadMedida: valores.unidadMedida.trim(),
      descripcion: valores.descripcion.trim(),
    };
    const id = this.editandoId();

    this.guardando.set(true);
    const peticion =
      id === null
        ? this.api.post<CategoriaRequest, CategoriaDto>('categorias', cuerpo)
        : this.api.put<CategoriaRequest, CategoriaDto>(`categorias/${id}`, cuerpo);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensajes.exito(id === null ? 'Categoría creada.' : 'Categoría actualizada.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mensajes.error(this.textoError(e, 'No se pudo guardar la categoría.'));
      },
    });
  }

  eliminar(categoria: CategoriaDto): void {
    // Acción crítica: se pide confirmación antes de enviar
    const confirmado = window.confirm(
      `¿Eliminar la categoría ${categoria.nombre}? Solo se puede si no tiene lotes asociados.`,
    );
    if (!confirmado) {
      return;
    }

    this.eliminandoId.set(categoria.id);
    this.api.delete<void>(`categorias/${categoria.id}`).subscribe({
      next: () => {
        this.categorias.update((lista) => lista.filter((c) => c.id !== categoria.id));
        this.eliminandoId.set(null);
        if (this.editandoId() === categoria.id) {
          this.cancelarEdicion();
        }
        this.mensajes.exito(`Categoría ${categoria.nombre} eliminada.`);
      },
      error: (e: HttpErrorResponse) => {
        this.eliminandoId.set(null);
        this.mensajes.error(
          this.textoError(
            e,
            'No se pudo eliminar la categoría. No se pueden eliminar categorías que tengan lotes asociados.',
          ),
        );
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.get<CategoriaDto[]>('categorias').subscribe({
      next: (lista) => {
        this.categorias.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensajes.error('No se pudieron cargar las categorías.');
      },
    });
  }

  /** Usa el mensaje que envíe la API si lo trae; si no, el texto por defecto. */
  private textoError(e: HttpErrorResponse, porDefecto: string): string {
    const cuerpo = e.error as { mensaje?: unknown; message?: unknown } | null;
    const texto = cuerpo?.mensaje ?? cuerpo?.message;
    return typeof texto === 'string' && texto.length > 0 ? texto : porDefecto;
  }
}