import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  ErrorApiCoordinador,
  IncidenciaCoordinadorDto,
  IncidenciaRequestDto,
  PaginaCoordinador,
  ResolverIncidenciaRequestDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

type FiltroIncidencia = 'TODAS' | 'PENDIENTES' | 'RESUELTAS';
type AccionIncidencia = 'reportar' | 'resolver' | null;

interface FilaIncidencia {
  id: string;
  lote: string;
  detalles: string;
  estadoAnterior: string;
  reportadaPor: string;
  fechaReporte: string;
  estado: string;
}

const TAMANO_PAGINA = 20;
const ORDEN_PAGINA = 'fechaReporte,desc';

const VALIDAR_ID_POSITIVO: ValidatorFn = (control): ValidationErrors | null => {
  const valor: unknown = control.value;
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
    ? null
    : { enteroPositivo: true };
};

const VALIDADORES_TEXTO_INCIDENCIA = [
  Validators.required,
  Validators.minLength(10),
  Validators.maxLength(500),
  Validators.pattern(/\S/),
];

const VALIDADORES_RESOLUCION = [
  Validators.required,
  Validators.minLength(5),
  Validators.maxLength(500),
  Validators.pattern(/\S/),
];

@Component({
  selector: 'app-gestionar-incidencias',
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
          <h2>Gestionar incidencias</h2>
          <p class="resumen">
            Consulta incidencias, reporta problemas en lotes y registra su resolución.
          </p>
        </div>
        <label class="filtro">
          Estado
          <select [value]="filtro()" (change)="cambiarFiltro($event)">
            <option value="TODAS">Todas</option>
            <option value="PENDIENTES">Pendientes</option>
            <option value="RESUELTAS">Resueltas</option>
          </select>
        </label>
      </header>

      <p class="total">{{ paginaActual()?.totalElementos ?? 0 }} incidencias</p>
      @if (cargando()) {
        <p class="estado" role="status">Cargando incidencias...</p>
      } @else if (errorCarga()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorCarga() }}</p>
          <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (incidencias().length === 0) {
        <p class="estado">No hay incidencias para el filtro seleccionado.</p>
      } @else {
        <app-tabla
          [filas]="filas()"
          [columnas]="columnas"
          [tamanoPagina]="TAMANO_PAGINA"
          textoVacio="No hay incidencias para mostrar."
        />
        @if (paginaActual() && paginaActual()!.totalPaginas > 1) {
          <nav class="paginacion" aria-label="Paginación de incidencias">
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
      }

      <section class="bloque" aria-labelledby="titulo-consulta-lote">
        <h3 id="titulo-consulta-lote">Consultar incidencias por lote</h3>
        <form class="consulta-lote" [formGroup]="consultaLoteForm" (ngSubmit)="buscarPorLote()">
          <label class="campo">
            Identificador del lote
            <input type="number" min="1" step="1" formControlName="loteId" />
          </label>
          @if (consultaLoteForm.controls.loteId.touched &&
            consultaLoteForm.controls.loteId.invalid) {
            @if (consultaLoteForm.controls.loteId.hasError('required')) {
              <small class="error-carga" role="alert">Ingresa el identificador del lote.</small>
            }
            @if (consultaLoteForm.controls.loteId.hasError('min') ||
              consultaLoteForm.controls.loteId.hasError('enteroPositivo')) {
              <small class="error-carga" role="alert">Usa un identificador entero mayor que cero.</small>
            }
          }
          <button type="submit" [disabled]="cargandoLote()">
            {{ cargandoLote() ? 'Consultando...' : 'Consultar lote' }}
          </button>
        </form>
        @if (errorLote()) {
          <p class="estado error-carga" role="alert">{{ errorLote() }}</p>
        } @else if (loteConsultadoId() !== null && incidenciasLote().length === 0 && !cargandoLote()) {
          <p class="estado">El lote #{{ loteConsultadoId() }} no tiene incidencias registradas.</p>
        } @else if (incidenciasLote().length > 0) {
          <h4>Incidencias del lote #{{ loteConsultadoId() }}</h4>
          <app-tabla
            [filas]="filasLote()"
            [columnas]="columnas"
            [tamanoPagina]="TAMANO_PAGINA"
            textoVacio="No hay incidencias para este lote."
          />
        }
      </section>

      <section class="bloque" aria-labelledby="titulo-reporte">
        <h3 id="titulo-reporte">Reportar incidencia</h3>
        <p class="ayuda">
          Al registrarse, una incidencia bloquea el lote para nuevas solicitudes.
        </p>
        <form [formGroup]="reporteForm" (ngSubmit)="solicitarReporte()">
          <label class="campo">
            Identificador del lote
            <input type="number" min="1" step="1" formControlName="loteId" />
          </label>
          @if (reporteForm.controls.loteId.touched && reporteForm.controls.loteId.invalid) {
            @if (reporteForm.controls.loteId.hasError('required')) {
              <small class="error-carga" role="alert">Ingresa el identificador del lote.</small>
            }
            @if (reporteForm.controls.loteId.hasError('min') ||
              reporteForm.controls.loteId.hasError('enteroPositivo')) {
              <small class="error-carga" role="alert">Usa un identificador entero mayor que cero.</small>
            }
          }
          <label class="campo">
            Detalles de la incidencia
            <textarea rows="4" minlength="10" maxlength="500" formControlName="detalles"></textarea>
          </label>
          <small class="ayuda">Obligatorios, de 10 a 500 caracteres y no pueden ser solo espacios.</small>
          @if (reporteForm.controls.detalles.touched && reporteForm.controls.detalles.invalid) {
            @if (reporteForm.controls.detalles.hasError('required') ||
              reporteForm.controls.detalles.hasError('pattern')) {
              <small class="error-carga" role="alert">Los detalles no pueden estar vacíos.</small>
            }
            @if (reporteForm.controls.detalles.hasError('minlength')) {
              <small class="error-carga" role="alert">Escribe al menos 10 caracteres.</small>
            }
            @if (reporteForm.controls.detalles.hasError('maxlength')) {
              <small class="error-carga" role="alert">No superes los 500 caracteres.</small>
            }
          }
          <button type="submit" [disabled]="guardando()">
            {{ guardando() ? 'Procesando...' : 'Continuar' }}
          </button>
        </form>
      </section>

      @if (pendientes().length > 0) {
        <section class="bloque" aria-labelledby="titulo-resolucion">
          <h3 id="titulo-resolucion">Resolver incidencia pendiente</h3>
          <form [formGroup]="resolucionForm" (ngSubmit)="solicitarResolucion()">
            <label class="campo">
              Incidencia
              <select
                [value]="incidenciaSeleccionadaId() ?? ''"
                (change)="cambiarIncidencia($event)"
              >
                <option value="">Selecciona una incidencia</option>
                @for (incidencia of pendientes(); track incidencia.id) {
                  <option [value]="incidencia.id">
                    #{{ incidencia.id }} · Lote #{{ incidencia.loteId }} · {{ incidencia.loteNombre }}
                  </option>
                }
              </select>
            </label>
            @if (seleccionTocada() && incidenciaSeleccionadaId() === null) {
              <small class="error-carga" role="alert">Selecciona una incidencia pendiente.</small>
            }

            @if (incidenciaSeleccionada(); as incidencia) {
              <article class="detalle">
                <h4>Incidencia #{{ incidencia.id }} · Lote #{{ incidencia.loteId }}</h4>
                <p><strong>Detalles:</strong> {{ incidencia.detalles }}</p>
                <label class="campo">
                  Resolución
                  <textarea rows="3" minlength="5" maxlength="500" formControlName="resolucion"></textarea>
                </label>
                <small class="ayuda">Obligatoria, de 5 a 500 caracteres y no puede ser solo espacios.</small>
                @if (resolucionForm.controls.resolucion.touched &&
                  resolucionForm.controls.resolucion.invalid) {
                  @if (resolucionForm.controls.resolucion.hasError('required') ||
                    resolucionForm.controls.resolucion.hasError('pattern')) {
                    <small class="error-carga" role="alert">La resolución es obligatoria.</small>
                  }
                  @if (resolucionForm.controls.resolucion.hasError('minlength')) {
                    <small class="error-carga" role="alert">Escribe al menos 5 caracteres.</small>
                  }
                  @if (resolucionForm.controls.resolucion.hasError('maxlength')) {
                    <small class="error-carga" role="alert">No superes los 500 caracteres.</small>
                  }
                }
                <fieldset>
                  <legend>Decisión para el lote</legend>
                  <label>
                    <input type="radio" formControlName="reactivarLote" [value]="true" />
                    Reactivar el lote
                  </label>
                  <label>
                    <input type="radio" formControlName="reactivarLote" [value]="false" />
                    Cancelar el lote
                  </label>
                </fieldset>
                @if (resolucionForm.controls.reactivarLote.touched &&
                  resolucionForm.controls.reactivarLote.hasError('required')) {
                  <small class="error-carga" role="alert">Elige qué hacer con el lote.</small>
                }
                <button type="submit" [disabled]="guardando()">
                  {{ guardando() ? 'Procesando...' : 'Continuar' }}
                </button>
              </article>
            }
          </form>
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
      <app-indicador-carga [visible]="guardando()" texto="Procesando incidencia..." />
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
      .bloque {
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
      input[type='number'],
      textarea {
        width: 100%;
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        background: #fff;
        color: #1f2a22;
        font: inherit;
      }
      input[type='radio'] {
        margin-right: 6px;
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
      form {
        display: grid;
        justify-items: start;
        gap: 6px;
        margin-top: 12px;
      }
      .detalle {
        width: 100%;
        margin-top: 16px;
      }
      fieldset {
        display: grid;
        gap: 10px;
        margin: 12px 0;
        padding: 12px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
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
export class GestionarIncidencias implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly reporteForm = this.fb.group({
    loteId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      VALIDAR_ID_POSITIVO,
    ]),
    detalles: this.fb.nonNullable.control('', VALIDADORES_TEXTO_INCIDENCIA),
  });

  readonly consultaLoteForm = this.fb.group({
    loteId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      VALIDAR_ID_POSITIVO,
    ]),
  });

  readonly resolucionForm = this.fb.group({
    resolucion: this.fb.nonNullable.control('', VALIDADORES_RESOLUCION),
    reactivarLote: this.fb.control<boolean | null>(null, Validators.required),
  });

  readonly filtro = signal<FiltroIncidencia>('TODAS');
  readonly pagina = signal(0);
  readonly paginaActual = signal<PaginaCoordinador<IncidenciaCoordinadorDto> | null>(null);
  readonly incidencias = signal<IncidenciaCoordinadorDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);
  readonly cargandoLote = signal(false);
  readonly errorLote = signal<string | null>(null);
  readonly loteConsultadoId = signal<number | null>(null);
  readonly incidenciasLote = signal<IncidenciaCoordinadorDto[]>([]);
  readonly incidenciaSeleccionadaId = signal<number | null>(null);
  readonly seleccionTocada = signal(false);
  readonly dialogoAccion = signal<AccionIncidencia>(null);
  readonly guardando = signal(false);

  readonly pendientes = computed(() => this.incidencias().filter((incidencia) => !incidencia.resuelta));
  readonly incidenciaSeleccionada = computed(
    () => this.pendientes().find((incidencia) => incidencia.id === this.incidenciaSeleccionadaId()) ?? null,
  );
  readonly dialogoAbierto = computed(() => this.dialogoAccion() !== null);
  readonly filas = computed(() => this.aFilas(this.incidencias()));
  readonly filasLote = computed(() => this.aFilas(this.incidenciasLote()));

  readonly columnas: ColumnaTabla<FilaIncidencia>[] = [
    { titulo: 'Incidencia', clave: 'id' },
    { titulo: 'Lote', clave: 'lote' },
    { titulo: 'Detalles', clave: 'detalles' },
    { titulo: 'Estado anterior del lote', clave: 'estadoAnterior' },
    { titulo: 'Reportada por', clave: 'reportadaPor' },
    { titulo: 'Fecha de reporte', clave: 'fechaReporte' },
    { titulo: 'Estado', clave: 'estado' },
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
    const filtro = this.filtro();
    if (filtro !== 'TODAS') {
      parametros.set('resuelta', String(filtro === 'RESUELTAS'));
    }

    this.api.get<PaginaCoordinador<IncidenciaCoordinadorDto>>(
      `incidencias?${parametros.toString()}`,
    ).subscribe({
      next: (pagina) => {
        this.paginaActual.set(pagina);
        this.incidencias.set(pagina.contenido);
        this.cargando.set(false);
        if (!this.pendientes().some((incidencia) => incidencia.id === this.incidenciaSeleccionadaId())) {
          this.limpiarSeleccion();
        }
      },
      error: (error: unknown) => {
        this.paginaActual.set(null);
        this.incidencias.set([]);
        this.cargando.set(false);
        this.limpiarSeleccion();
        const mensaje = this.mensajeError(error, 'No se pudieron cargar las incidencias.');
        this.errorCarga.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cambiarFiltro(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const valor = elemento.value;
    if (valor !== 'TODAS' && valor !== 'PENDIENTES' && valor !== 'RESUELTAS') {
      return;
    }
    if (valor === this.filtro()) {
      return;
    }
    this.filtro.set(valor);
    this.pagina.set(0);
    this.limpiarSeleccion();
    this.cargar();
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

  buscarPorLote(): void {
    this.consultaLoteForm.markAllAsTouched();
    if (this.consultaLoteForm.invalid) {
      return;
    }
    const loteId = this.consultaLoteForm.controls.loteId.value;
    if (loteId === null) {
      return;
    }
    this.cargarPorLote(loteId);
  }

  solicitarReporte(): void {
    this.reporteForm.markAllAsTouched();
    if (this.reporteForm.invalid) {
      return;
    }
    this.dialogoAccion.set('reportar');
  }

  cambiarIncidencia(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    const estaPendiente = this.pendientes().some((incidencia) => incidencia.id === id);
    this.incidenciaSeleccionadaId.set(Number.isInteger(id) && estaPendiente ? id : null);
    this.seleccionTocada.set(true);
    this.dialogoAccion.set(null);
    this.resolucionForm.reset({ resolucion: '', reactivarLote: null });
  }

  solicitarResolucion(): void {
    if (!this.incidenciaSeleccionada()) {
      this.seleccionTocada.set(true);
      return;
    }
    this.resolucionForm.markAllAsTouched();
    if (this.resolucionForm.invalid) {
      return;
    }
    this.dialogoAccion.set('resolver');
  }

  confirmarAccion(): void {
    const accion = this.dialogoAccion();
    if (this.guardando() || !accion) {
      this.dialogoAccion.set(null);
      return;
    }
    if (accion === 'reportar') {
      this.reportarIncidencia();
    } else {
      this.resolverIncidencia();
    }
  }

  cerrarDialogo(): void {
    this.dialogoAccion.set(null);
  }

  tituloDialogo(): string {
    return this.dialogoAccion() === 'reportar'
      ? 'Confirmar reporte de incidencia'
      : 'Confirmar resolución de incidencia';
  }

  mensajeDialogo(): string {
    if (this.dialogoAccion() === 'reportar') {
      const loteId = this.reporteForm.controls.loteId.value;
      return `¿Confirmas reportar una incidencia en el lote #${loteId}? El reporte puede bloquear nuevas solicitudes.`;
    }
    const incidencia = this.incidenciaSeleccionada();
    if (!incidencia) {
      return 'Selecciona una incidencia pendiente.';
    }
    const destino = this.resolucionForm.controls.reactivarLote.value
      ? 'reactivar'
      : 'cancelar';
    return `¿Confirmas resolver la incidencia #${incidencia.id} y ${destino} el lote si no quedan otras incidencias abiertas?`;
  }

  textoConfirmar(): string {
    return this.dialogoAccion() === 'reportar' ? 'Reportar incidencia' : 'Resolver incidencia';
  }

  estadoLote(estado: string | null): string {
    if (estado === null) {
      return 'No especificado';
    }
    const etiquetas: Record<string, string> = {
      BORRADOR: 'Borrador',
      DISPONIBLE: 'Disponible',
      ASIGNADO: 'Asignado',
      ENTREGADO: 'Entregado',
      INCIDENCIA: 'Con incidencia',
      CANCELADO: 'Cancelado',
      VENCIDO: 'Vencido',
    };
    return etiquetas[estado] ?? estado;
  }

  private reportarIncidencia(): void {
    this.reporteForm.markAllAsTouched();
    if (this.reporteForm.invalid || this.guardando()) {
      this.dialogoAccion.set(null);
      return;
    }
    const loteId = this.reporteForm.controls.loteId.value;
    if (loteId === null) {
      this.dialogoAccion.set(null);
      return;
    }
    const cuerpo: IncidenciaRequestDto = {
      loteId,
      detalles: this.reporteForm.controls.detalles.value.trim(),
    };
    this.dialogoAccion.set(null);
    this.guardando.set(true);
    this.api.post<IncidenciaRequestDto, IncidenciaCoordinadorDto>('incidencias', cuerpo).subscribe({
      next: (incidencia) => {
        this.guardando.set(false);
        this.mensajes.exito(`Incidencia #${incidencia.id} registrada para el lote #${incidencia.loteId}.`);
        this.reporteForm.reset({ loteId: null, detalles: '' });
        this.cargar();
        if (this.loteConsultadoId() === incidencia.loteId) {
          this.cargarPorLote(incidencia.loteId);
        }
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.mensajes.error(this.mensajeError(error, 'No se pudo reportar la incidencia.'));
      },
    });
  }

  private resolverIncidencia(): void {
    const incidencia = this.incidenciaSeleccionada();
    this.resolucionForm.markAllAsTouched();
    if (!incidencia || this.resolucionForm.invalid || this.guardando()) {
      this.dialogoAccion.set(null);
      return;
    }
    const reactivarLote = this.resolucionForm.controls.reactivarLote.value;
    if (reactivarLote === null) {
      this.dialogoAccion.set(null);
      return;
    }
    const cuerpo: ResolverIncidenciaRequestDto = {
      reactivarLote,
      resolucion: this.resolucionForm.controls.resolucion.value.trim(),
    };
    this.dialogoAccion.set(null);
    this.guardando.set(true);
    this.api.patch<ResolverIncidenciaRequestDto, IncidenciaCoordinadorDto>(
      `incidencias/${incidencia.id}/resolver`,
      cuerpo,
    ).subscribe({
      next: (incidenciaResuelta) => {
        this.guardando.set(false);
        this.mensajes.exito(`Incidencia #${incidenciaResuelta.id} resuelta.`);
        this.limpiarSeleccion();
        this.cargar();
        if (this.loteConsultadoId() === incidenciaResuelta.loteId) {
          this.cargarPorLote(incidenciaResuelta.loteId);
        }
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.mensajes.error(this.mensajeError(error, 'No se pudo resolver la incidencia.'));
      },
    });
  }

  private cargarPorLote(loteId: number): void {
    this.cargandoLote.set(true);
    this.errorLote.set(null);
    this.loteConsultadoId.set(loteId);
    this.incidenciasLote.set([]);
    this.api.get<IncidenciaCoordinadorDto[]>(`incidencias/lote/${loteId}`).subscribe({
      next: (incidencias) => {
        this.incidenciasLote.set(incidencias);
        this.cargandoLote.set(false);
      },
      error: (error: unknown) => {
        this.cargandoLote.set(false);
        const mensaje = this.mensajeError(error, 'No se pudieron consultar las incidencias del lote.');
        this.errorLote.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  private limpiarSeleccion(): void {
    this.incidenciaSeleccionadaId.set(null);
    this.seleccionTocada.set(false);
    this.dialogoAccion.set(null);
    this.resolucionForm.reset({ resolucion: '', reactivarLote: null });
  }

  private aFilas(incidencias: IncidenciaCoordinadorDto[]): FilaIncidencia[] {
    return incidencias.map((incidencia) => ({
      id: `#${incidencia.id}`,
      lote: `${incidencia.loteNombre} (#${incidencia.loteId})`,
      detalles: incidencia.detalles,
      estadoAnterior: this.estadoLote(incidencia.estadoLoteAnterior),
      reportadaPor: incidencia.reportadoPor,
      fechaReporte: this.formatearFecha(incidencia.fechaReporte),
      estado: incidencia.resuelta ? 'Resuelta' : 'Pendiente',
    }));
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
