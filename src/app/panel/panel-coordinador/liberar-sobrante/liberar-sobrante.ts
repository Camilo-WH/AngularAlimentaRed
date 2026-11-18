import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  AsignacionDto,
  ErrorApiCoordinador,
  EstadoAsignacion,
  PaginaCoordinador,
  RestockSobranteRequestDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

interface FilaAsignacionAbierta {
  id: string;
  solicitud: string;
  lote: string;
  organizacion: string;
  cantidadPendiente: string;
  estado: string;
  fechaLimite: string;
}

const TAMANO_PAGINA = 20;
const ORDEN_PAGINA = 'fechaAsignacion,desc';

function esAsignacionAbierta(estado: EstadoAsignacion): boolean {
  return estado === 'ACTIVA' || estado === 'RETIRO_PARCIAL';
}

@Component({
  selector: 'app-liberar-sobrante',
  standalone: true,
  imports: [
    DialogoConfirmacionComponent,
    IndicadorCargaComponent,
    ReactiveFormsModule,
    TablaComponent,
  ],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Liberar sobrante</h2>
          <p class="resumen">
            Devuelve al catálogo la cantidad pendiente de una asignación abierta.
          </p>
        </div>
        <span class="total">{{ abiertas().length }} asignaciones abiertas en esta página</span>
      </header>

      @if (cargando()) {
        <p class="estado" role="status">Cargando asignaciones...</p>
      } @else if (errorCarga()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorCarga() }}</p>
          <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
        </div>
      } @else if ((paginaActual()?.totalElementos ?? 0) === 0) {
        <p class="estado">No hay asignaciones registradas.</p>
      } @else if (abiertas().length === 0) {
        <p class="estado">No hay asignaciones abiertas en esta página.</p>
      } @else {
        <app-tabla
          [filas]="filas()"
          [columnas]="columnas"
          [tamanoPagina]="TAMANO_PAGINA"
          textoVacio="No hay asignaciones abiertas en esta página."
        />
      }

      @if (!cargando() && !errorCarga() && paginaActual() && paginaActual()!.totalPaginas > 1) {
        <nav class="paginacion" aria-label="Paginación de asignaciones">
          <button
            type="button"
            class="secundario"
            [disabled]="pagina() === 0 || cargando()"
            (click)="irAPagina(pagina() - 1)"
          >
            Anterior
          </button>
          <span>Página {{ paginaActual()!.pagina + 1 }} de {{ paginaActual()!.totalPaginas }}</span>
          <button
            type="button"
            class="secundario"
            [disabled]="paginaActual()!.ultima || cargando()"
            (click)="irAPagina(pagina() + 1)"
          >
            Siguiente
          </button>
        </nav>
      }

      @if (abiertas().length > 0 && !cargando()) {
        <section class="operacion" aria-labelledby="titulo-operacion">
          <h3 id="titulo-operacion">Restock del sobrante</h3>
          <label class="campo">
            Asignación abierta
            <select
              [value]="asignacionSeleccionadaId() ?? ''"
              (change)="cambiarAsignacion($event)"
            >
              <option value="">Selecciona una asignación</option>
              @for (asignacion of abiertas(); track asignacion.id) {
                <option [value]="asignacion.id">
                  #{{ asignacion.id }} · {{ asignacion.loteNombre }} ·
                  {{ asignacion.organizacionNombre }} · pendiente:
                  {{ asignacion.cantidadPendiente }} {{ asignacion.unidadMedida }}
                </option>
              }
            </select>
          </label>

          @if (seleccionTocada() && asignacionSeleccionadaId() === null) {
            <small class="error-carga" role="alert">Selecciona una asignación abierta.</small>
          }

          @if (asignacionSeleccionada(); as asignacion) {
            <article class="detalle">
              <h4>Asignación #{{ asignacion.id }}</h4>
              <dl>
                <div><dt>Solicitud</dt><dd>#{{ asignacion.solicitudId }}</dd></div>
                <div><dt>Lote</dt><dd>{{ asignacion.loteNombre }} (#{{ asignacion.loteId }})</dd></div>
                <div>
                  <dt>Organización receptora</dt><dd>{{ asignacion.organizacionNombre }}</dd>
                </div>
                <div>
                  <dt>Cantidad pendiente por devolver</dt>
                  <dd>{{ asignacion.cantidadPendiente }} {{ asignacion.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Estado</dt><dd>{{ etiquetaEstado(asignacion.estado) }}</dd>
                </div>
                <div>
                  <dt>Límite de retiro</dt><dd>{{ formatearFecha(asignacion.fechaLimiteRetiro) }}</dd>
                </div>
              </dl>

              <form [formGroup]="form" (ngSubmit)="solicitarConfirmacion()">
                <label class="campo">
                  Observaciones
                  <textarea
                    rows="3"
                    minlength="5"
                    maxlength="500"
                    formControlName="observaciones"
                  ></textarea>
                </label>
                <small class="ayuda">
                  Obligatorio, de 5 a 500 caracteres y no puede contener solo espacios.
                </small>
                @if (form.controls.observaciones.touched && form.controls.observaciones.invalid) {
                  @if (form.controls.observaciones.hasError('required') ||
                    form.controls.observaciones.hasError('pattern')) {
                    <small class="error-carga" role="alert">
                      Escribe observaciones que no sean solo espacios.
                    </small>
                  }
                  @if (form.controls.observaciones.hasError('minlength')) {
                    <small class="error-carga" role="alert">Escribe al menos 5 caracteres.</small>
                  }
                  @if (form.controls.observaciones.hasError('maxlength')) {
                    <small class="error-carga" role="alert">No superes los 500 caracteres.</small>
                  }
                }
                <button type="submit" [disabled]="guardando()">
                  {{ guardando() ? 'Procesando...' : 'Continuar' }}
                </button>
              </form>
            </article>
          }
        </section>
      }

      <app-dialogo-confirmacion
        [abierto]="dialogoAbierto()"
        titulo="Confirmar liberación del sobrante"
        [mensaje]="mensajeDialogo()"
        textoConfirmar="Liberar sobrante"
        (confirmado)="liberarSobrante()"
        (cancelado)="cerrarDialogo()"
      />
      <app-indicador-carga [visible]="guardando()" texto="Liberando sobrante..." />
    </section>
  `,
  styles: [
    `
      h2,
      h3,
      h4 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .cabecera {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .resumen,
      .estado,
      .total,
      .ayuda {
        color: var(--color-texto-secundario);
      }
      .resumen {
        margin: 5px 0 0;
      }
      .total {
        margin-bottom: 14px;
        font-size: var(--texto-sm);
      }
      .estado {
        padding: 14px 0;
      }
      .error-carga {
        color: var(--color-error);
      }
      .paginacion {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 0 24px;
      }
      .operacion {
        margin-top: 24px;
        padding: clamp(18px, 2vw, 24px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }
      .campo {
        display: grid;
        width: min(100%, 560px);
        gap: 6px;
        margin: 14px 0;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      select,
      textarea {
        width: 100%;
        min-height: 42px;
        padding: 9px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
      }
      textarea {
        resize: vertical;
      }
      button {
        min-height: 40px;
        padding: 8px 14px;
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
      .detalle h4 {
        margin: 18px 0 12px;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 12px;
        margin: 0;
      }
      dl div {
        padding: 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-superficie-secundaria);
      }
      dt {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
      }
      dd {
        margin: 4px 0 0;
        overflow-wrap: anywhere;
      }
      form {
        display: grid;
        justify-items: start;
        gap: 6px;
        margin-top: 18px;
      }
      @media (max-width: 600px) {
        .cabecera {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class LiberarSobrante implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    observaciones: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
      Validators.pattern(/\S/),
    ]),
  });

  readonly pagina = signal(0);
  readonly paginaActual = signal<PaginaCoordinador<AsignacionDto> | null>(null);
  readonly asignaciones = signal<AsignacionDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly asignacionSeleccionadaId = signal<number | null>(null);
  readonly seleccionTocada = signal(false);
  readonly dialogoAbierto = signal(false);
  readonly guardando = signal(false);

  readonly abiertas = computed(() =>
    this.asignaciones().filter((asignacion) => esAsignacionAbierta(asignacion.estado)),
  );
  readonly asignacionSeleccionada = computed(
    () => this.abiertas().find((asignacion) => asignacion.id === this.asignacionSeleccionadaId()) ?? null,
  );
  readonly filas = computed<FilaAsignacionAbierta[]>(() =>
    this.abiertas().map((asignacion) => ({
      id: `#${asignacion.id}`,
      solicitud: `#${asignacion.solicitudId}`,
      lote: `${asignacion.loteNombre} (#${asignacion.loteId})`,
      organizacion: asignacion.organizacionNombre,
      cantidadPendiente: `${asignacion.cantidadPendiente} ${asignacion.unidadMedida}`,
      estado: this.etiquetaEstado(asignacion.estado),
      fechaLimite: this.formatearFecha(asignacion.fechaLimiteRetiro),
    })),
  );

  readonly columnas: ColumnaTabla<FilaAsignacionAbierta>[] = [
    { titulo: 'Asignación', clave: 'id' },
    { titulo: 'Solicitud', clave: 'solicitud' },
    { titulo: 'Lote', clave: 'lote' },
    { titulo: 'Organización receptora', clave: 'organizacion' },
    { titulo: 'Cantidad pendiente', clave: 'cantidadPendiente' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Límite de retiro', clave: 'fechaLimite' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    const parametros = new URLSearchParams({
      page: String(this.pagina()),
      size: String(TAMANO_PAGINA),
      sort: ORDEN_PAGINA,
    });

    this.api.get<PaginaCoordinador<AsignacionDto>>(
      `entregas/asignaciones?${parametros.toString()}`,
    ).subscribe({
      next: (pagina) => {
        this.paginaActual.set(pagina);
        this.asignaciones.set(pagina.contenido);
        this.cargando.set(false);
        if (!this.abiertas().some((asignacion) => asignacion.id === this.asignacionSeleccionadaId())) {
          this.limpiarSeleccion();
        }
      },
      error: (error: unknown) => {
        this.paginaActual.set(null);
        this.asignaciones.set([]);
        this.cargando.set(false);
        this.limpiarSeleccion();
        const mensaje = this.mensajeError(error, 'No se pudieron cargar las asignaciones.');
        this.errorCarga.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  irAPagina(numero: number): void {
    const pagina = this.paginaActual();
    if (numero < 0 || (pagina && numero >= pagina.totalPaginas) || numero === this.pagina()) {
      return;
    }
    this.pagina.set(numero);
    this.limpiarSeleccion();
    this.cargar();
  }

  cambiarAsignacion(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    const estaAbierta = this.abiertas().some((asignacion) => asignacion.id === id);
    this.asignacionSeleccionadaId.set(Number.isInteger(id) && estaAbierta ? id : null);
    this.seleccionTocada.set(true);
    this.dialogoAbierto.set(false);
    this.form.reset({ observaciones: '' });
  }

  solicitarConfirmacion(): void {
    const asignacion = this.asignacionSeleccionada();
    if (!asignacion) {
      this.seleccionTocada.set(true);
      return;
    }
    if (!esAsignacionAbierta(asignacion.estado)) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.dialogoAbierto.set(true);
  }

  liberarSobrante(): void {
    const asignacion = this.asignacionSeleccionada();
    if (!asignacion || !esAsignacionAbierta(asignacion.estado) || this.guardando()) {
      this.dialogoAbierto.set(false);
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.dialogoAbierto.set(false);
      return;
    }

    const cuerpo: RestockSobranteRequestDto = {
      observaciones: this.form.controls.observaciones.value.trim(),
    };
    this.dialogoAbierto.set(false);
    this.guardando.set(true);
    this.api.patch<RestockSobranteRequestDto, AsignacionDto>(
      `entregas/${asignacion.id}/restock`,
      cuerpo,
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensajes.exito(`Asignación #${asignacion.id}: sobrante devuelto al catálogo.`);
        this.limpiarSeleccion();
        this.cargar();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.mensajes.error(this.mensajeError(error, 'No se pudo liberar el sobrante.'));
      },
    });
  }

  cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
  }

  mensajeDialogo(): string {
    const asignacion = this.asignacionSeleccionada();
    if (!asignacion) {
      return 'Selecciona una asignación abierta.';
    }
    return `¿Confirmas devolver ${asignacion.cantidadPendiente} ${asignacion.unidadMedida} al catálogo desde la asignación #${asignacion.id}?`;
  }

  etiquetaEstado(estado: EstadoAsignacion): string {
    const etiquetas: Record<EstadoAsignacion, string> = {
      ACTIVA: 'Activa',
      RETIRO_PARCIAL: 'Retiro parcial',
      COMPLETADA: 'Completada',
      NO_RECOGIDA: 'No recogida',
      CANCELADA: 'Cancelada',
      CERRADA_CON_RESTOCK: 'Cerrada con sobrante',
    };
    return etiquetas[estado];
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-CO');
  }

  private limpiarSeleccion(): void {
    this.asignacionSeleccionadaId.set(null);
    this.seleccionTocada.set(false);
    this.dialogoAbierto.set(false);
    this.form.reset({ observaciones: '' });
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return porDefecto;
    }
    const cuerpo: unknown = error.error;
    if (typeof cuerpo !== 'object' || cuerpo === null) {
      return porDefecto;
    }
    const respuesta = cuerpo as Partial<ErrorApiCoordinador>;
    const mensaje = typeof respuesta.mensaje === 'string' ? respuesta.mensaje.trim() : '';
    const detalles = Array.isArray(respuesta.detalles)
      ? respuesta.detalles.filter((detalle): detalle is string => typeof detalle === 'string')
      : [];
    const textoDetalles = detalles.length > 0 ? ` Detalles: ${detalles.join(' · ')}` : '';
    return mensaje ? `${mensaje}${textoDetalles}` : porDefecto;
  }
}
