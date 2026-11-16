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
      }
      .resumen,
      .estado {
        color: #647168;
      }
      .formulario {
        margin: 16px 0 24px;
        padding: 16px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
        color: #1f2a22;
      }
      .campos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin: 12px 0;
      }
      .ancho {
        grid-column: 1 / -1;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 14px;
      }
      input,
      textarea {
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        font: inherit;
        color: #1f2a22;
      }
      .error {
        color: #b91c1c;
      }
      .acciones {
        display: flex;
        gap: 8px;
      }
      button {
        padding: 8px 14px;
        border: 0;
        border-radius: 6px;
        background: #2e7d32;
        color: #fff;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .secundario {
        border: 1px solid #cbd5ce;
        background: #fff;
        color: #1f2a22;
      }
      .peligro {
        background: #b91c1c;
      }
      .contenedor {
        overflow-x: auto;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
        color: #1f2a22;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #e8ece9;
      }
      th {
        background: #f3f7f4;
        font-weight: 600;
      }
      .celda-acciones {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .oculto {
        position: absolute;
        left: -9999px;
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