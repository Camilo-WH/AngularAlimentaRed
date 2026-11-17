import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  AsignacionDto,
  ConfirmarSalidaRequestDto,
  ErrorApiCoordinador,
  NoRecogidaRequestDto,
  PaginaCoordinador,
  EstadoAsignacion,
  EntregaDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

type AccionSalida = 'confirmar' | 'no-recogida' | '';

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
const VALIDAR_PRECISION_CANTIDAD: ValidatorFn = (control): ValidationErrors | null => {
  const valor: unknown = control.value;
  if (typeof valor !== 'number') {
    return null;
  }
  return /^\d{1,9}(?:\.\d{1,3})?$/.test(String(valor)) ? null : { precisionCantidad: true };
};

function esAsignacionAbierta(estado: EstadoAsignacion): boolean {
  return estado === 'ACTIVA' || estado === 'RETIRO_PARCIAL';
}

@Component({
  selector: 'app-confirmar-salida',
  standalone: true,
  imports: [
    DatePipe,
    DialogoConfirmacionComponent,
    IndicadorCargaComponent,
    ReactiveFormsModule,
    TablaComponent,
  ],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Confirmar salida</h2>
          <p class="resumen">Registra el retiro de alimentos o informa que una asignación no fue recogida.</p>
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
          <h3 id="titulo-operacion">Registrar salida o no recogida</h3>
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
              <h4>Asignación #{{ asignacion.id }} · {{ etiquetaEstado(asignacion.estado) }}</h4>
              <dl>
                <div><dt>Solicitud</dt><dd>#{{ asignacion.solicitudId }}</dd></div>
                <div><dt>Lote</dt><dd>{{ asignacion.loteNombre }} (#{{ asignacion.loteId }})</dd></div>
                <div><dt>Organización receptora</dt><dd>{{ asignacion.organizacionNombre }}</dd></div>
                <div>
                  <dt>Cantidad pendiente</dt>
                  <dd>{{ asignacion.cantidadPendiente }} {{ asignacion.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Límite de retiro</dt>
                  <dd>{{ asignacion.fechaLimiteRetiro | date: 'dd/MM/yyyy HH:mm' }}</dd>
                </div>
                @if (asignacion.ubicacion) {
                  <div><dt>Ubicación</dt><dd>{{ asignacion.ubicacion }}</dd></div>
                }
                @if (asignacion.instruccionesRecogida) {
                  <div><dt>Instrucciones</dt><dd>{{ asignacion.instruccionesRecogida }}</dd></div>
                }
                @if (asignacion.contacto) {
                  <div><dt>Contacto</dt><dd>{{ asignacion.contacto }}</dd></div>
                }
              </dl>

              <form [formGroup]="form" (ngSubmit)="solicitarConfirmacion()">
                <label class="campo">
                  Acción
                  <select [value]="form.controls.accion.value" (change)="cambiarAccion($event)">
                    <option value="">Selecciona una acción</option>
                    <option value="confirmar">Confirmar retiro</option>
                    <option value="no-recogida">Registrar no recogida</option>
                  </select>
                </label>
                @if (form.controls.accion.touched && form.controls.accion.invalid) {
                  <small class="error-carga" role="alert">Selecciona una acción.</small>
                }

                @if (form.controls.accion.value === 'confirmar') {
                  <label class="campo">
                    Cantidad retirada ({{ asignacion.unidadMedida }})
                    <input
                      type="number"
                      min="0.001"
                      max="999999999.999"
                      step="0.001"
                      formControlName="cantidadRetirada"
                    />
                  </label>
                  @if (form.controls.cantidadRetirada.touched && form.controls.cantidadRetirada.invalid) {
                    @if (form.controls.cantidadRetirada.hasError('required')) {
                      <small class="error-carga" role="alert">Ingresa la cantidad retirada.</small>
                    }
                    @if (form.controls.cantidadRetirada.hasError('min')) {
                      <small class="error-carga" role="alert">La cantidad debe ser mayor a cero (mínimo 0.001).</small>
                    }
                    @if (form.controls.cantidadRetirada.hasError('max')) {
                      <small class="error-carga" role="alert">
                        La cantidad no puede superar lo pendiente ({{ asignacion.cantidadPendiente }}).
                      </small>
                    }
                    @if (form.controls.cantidadRetirada.hasError('precisionCantidad')) {
                      <small class="error-carga" role="alert">
                        Usa hasta 9 dígitos enteros y 3 decimales.
                      </small>
                    }
                  }
                  <label class="campo">
                    Observaciones (opcional)
                    <textarea rows="3" maxlength="500" formControlName="observaciones"></textarea>
                  </label>
                  @if (form.controls.observaciones.touched && form.controls.observaciones.hasError('maxlength')) {
                    <small class="error-carga" role="alert">Las observaciones no pueden superar 500 caracteres.</small>
                  }
                } @else if (form.controls.accion.value === 'no-recogida') {
                  <label class="campo">
                    Observaciones
                    <textarea
                      rows="3"
                      minlength="5"
                      maxlength="500"
                      formControlName="observaciones"
                    ></textarea>
                  </label>
                  <small class="ayuda">Obligatorias, de 5 a 500 caracteres y no pueden ser solo espacios.</small>
                  @if (form.controls.observaciones.touched && form.controls.observaciones.invalid) {
                    @if (form.controls.observaciones.hasError('required') ||
                      form.controls.observaciones.hasError('pattern')) {
                      <small class="error-carga" role="alert">Las observaciones son obligatorias.</small>
                    }
                    @if (form.controls.observaciones.hasError('minlength')) {
                      <small class="error-carga" role="alert">Escribe al menos 5 caracteres.</small>
                    }
                    @if (form.controls.observaciones.hasError('maxlength')) {
                      <small class="error-carga" role="alert">No superes los 500 caracteres.</small>
                    }
                  }
                }

                <button type="submit" [disabled]="guardando()">
                  {{ guardando() ? 'Enviando...' : 'Continuar' }}
                </button>
              </form>
            </article>
          }
        </section>
      }

      <app-dialogo-confirmacion
        [abierto]="dialogoAbierto()"
        [titulo]="tituloDialogo()"
        [mensaje]="mensajeDialogo()"
        [textoConfirmar]="textoConfirmar()"
        (confirmado)="confirmarAccion()"
        (cancelado)="cerrarDialogo()"
      />
      <app-indicador-carga [visible]="guardando()" texto="Registrando salida..." />
    </section>
  `,
  styles: [
    `
      h2,
      h3,
      h4 {
        margin: 0;
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
        color: #647168;
      }
      .resumen {
        margin: 5px 0 0;
      }
      .total {
        margin-bottom: 14px;
        font-size: 14px;
      }
      .estado {
        padding: 14px 0;
      }
      .error-carga {
        color: #991b1b;
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
        padding: 18px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
      }
      .campo {
        display: grid;
        width: min(100%, 560px);
        gap: 5px;
        margin: 14px 0;
        color: #34443a;
        font-size: 14px;
      }
      select,
      input,
      textarea {
        width: 100%;
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        background: #fff;
        color: #1f2a22;
        font: inherit;
      }
      textarea {
        resize: vertical;
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
        padding: 10px;
        border-radius: 6px;
        background: #f3f7f4;
      }
      dt {
        color: #647168;
        font-size: 13px;
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
export class ConfirmarSalida implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    accion: this.fb.nonNullable.control<AccionSalida>('', Validators.required),
    cantidadRetirada: this.fb.control<number | null>(null),
    observaciones: this.fb.nonNullable.control(''),
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

  readonly abiertas = computed(() => this.asignaciones().filter((item) => esAsignacionAbierta(item.estado)));
  readonly asignacionSeleccionada = computed(
    () => this.abiertas().find((item) => item.id === this.asignacionSeleccionadaId()) ?? null,
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
        if (!this.abiertas().some((item) => item.id === this.asignacionSeleccionadaId())) {
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
    const esAbierta = this.abiertas().some((asignacion) => asignacion.id === id);
    this.asignacionSeleccionadaId.set(Number.isInteger(id) && esAbierta ? id : null);
    this.seleccionTocada.set(true);
    this.dialogoAbierto.set(false);
    this.reiniciarFormulario();
  }

  cambiarAccion(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const valor = elemento.value;
    const accion: AccionSalida =
      valor === 'confirmar' || valor === 'no-recogida' ? valor : '';
    this.form.controls.accion.setValue(accion);
    this.form.controls.accion.markAsTouched();
    this.configurarValidadores(accion);
    this.form.controls.cantidadRetirada.setValue(null);
    this.form.controls.observaciones.setValue('');
    this.dialogoAbierto.set(false);
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

    const accion = this.form.controls.accion.value;
    this.configurarValidadores(accion);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.dialogoAbierto.set(true);
  }

  confirmarAccion(): void {
    const asignacion = this.asignacionSeleccionada();
    const accion = this.form.controls.accion.value;
    if (!asignacion || !esAsignacionAbierta(asignacion.estado) || this.guardando()) {
      this.dialogoAbierto.set(false);
      return;
    }

    this.configurarValidadores(accion);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.dialogoAbierto.set(false);
      return;
    }

    this.dialogoAbierto.set(false);
    this.guardando.set(true);
    if (accion === 'confirmar') {
      const cantidadRetirada = this.form.controls.cantidadRetirada.value;
      if (cantidadRetirada === null) {
        this.guardando.set(false);
        return;
      }
      const cuerpo: ConfirmarSalidaRequestDto = {
        cantidadRetirada,
        observaciones: this.form.controls.observaciones.value.trim() || null,
      };
      this.api.patch<ConfirmarSalidaRequestDto, EntregaDto>(
        `entregas/${asignacion.id}/confirmar`,
        cuerpo,
      ).subscribe({
        next: () => this.accionExitosa(asignacion, 'retiro confirmado'),
        error: (error: unknown) => this.accionFallida(error),
      });
      return;
    }

    if (accion === 'no-recogida') {
      const cuerpo: NoRecogidaRequestDto = {
        observaciones: this.form.controls.observaciones.value.trim(),
      };
      this.api.patch<NoRecogidaRequestDto, AsignacionDto>(
        `entregas/${asignacion.id}/no-recogida`,
        cuerpo,
      ).subscribe({
        next: () => this.accionExitosa(asignacion, 'registrada como no recogida'),
        error: (error: unknown) => this.accionFallida(error),
      });
      return;
    }

    this.guardando.set(false);
  }

  cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
  }

  tituloDialogo(): string {
    return this.form.controls.accion.value === 'confirmar'
      ? 'Confirmar retiro'
      : 'Confirmar asignación no recogida';
  }

  mensajeDialogo(): string {
    const asignacion = this.asignacionSeleccionada();
    if (!asignacion) {
      return 'Selecciona una asignación abierta.';
    }
    if (this.form.controls.accion.value === 'confirmar') {
      return `¿Confirmas el retiro de ${this.form.controls.cantidadRetirada.value} ${asignacion.unidadMedida} de la asignación #${asignacion.id}?`;
    }
    return `¿Confirmas registrar la asignación #${asignacion.id} como no recogida?`;
  }

  textoConfirmar(): string {
    return this.form.controls.accion.value === 'confirmar' ? 'Confirmar retiro' : 'Registrar no recogida';
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

  private configurarValidadores(accion: AccionSalida): void {
    const cantidad = this.form.controls.cantidadRetirada;
    const observaciones = this.form.controls.observaciones;
    if (accion === 'confirmar') {
      const pendiente = this.asignacionSeleccionada()?.cantidadPendiente ?? 999999999.999;
      cantidad.setValidators([
        Validators.required,
        Validators.min(0.001),
        Validators.max(Math.min(pendiente, 999999999.999)),
        VALIDAR_PRECISION_CANTIDAD,
      ]);
      observaciones.setValidators([Validators.maxLength(500)]);
    } else if (accion === 'no-recogida') {
      cantidad.clearValidators();
      observaciones.setValidators([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(500),
        Validators.pattern(/\S/),
      ]);
    } else {
      cantidad.clearValidators();
      observaciones.setValidators([Validators.maxLength(500)]);
    }
    cantidad.updateValueAndValidity({ emitEvent: false });
    observaciones.updateValueAndValidity({ emitEvent: false });
  }

  private reiniciarFormulario(): void {
    this.form.reset({ accion: '', cantidadRetirada: null, observaciones: '' });
    this.configurarValidadores('');
  }

  private limpiarSeleccion(): void {
    this.asignacionSeleccionadaId.set(null);
    this.seleccionTocada.set(false);
    this.dialogoAbierto.set(false);
    this.reiniciarFormulario();
  }

  private accionExitosa(asignacion: AsignacionDto, resultado: string): void {
    this.guardando.set(false);
    this.mensajes.exito(`Asignación #${asignacion.id}: ${resultado}.`);
    this.limpiarSeleccion();
    this.cargar();
  }

  private accionFallida(error: unknown): void {
    this.guardando.set(false);
    this.mensajes.error(this.mensajeError(error, 'No se pudo registrar la salida.'));
  }

  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-CO');
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
