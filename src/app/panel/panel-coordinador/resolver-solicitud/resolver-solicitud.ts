import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  ErrorApiCoordinador,
  EstadoSolicitud,
  PaginaCoordinador,
  ResolverSolicitudRequest,
  SolicitudDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

type FiltroEstado = EstadoSolicitud | 'TODAS';
type Decision = 'aprobar' | 'rechazar' | '';

interface FilaSolicitud {
  id: string;
  lote: string;
  organizacion: string;
  cantidad: string;
  estado: string;
  empate: string;
  fecha: string;
  limite: string;
}

const TAMANO_PAGINA = 20;
const ORDEN_PAGINA = 'fechaCreacion,desc';

function esFiltroEstado(valor: string): valor is FiltroEstado {
  return (
    valor === 'TODAS' ||
    valor === 'APROBADO' ||
    valor === 'CANCELADO' ||
    valor === 'PENDIENTE' ||
    valor === 'RECHAZADA' ||
    valor === 'EXPIRADA' ||
    valor === 'COMPLETADA'
  );
}

@Component({
  selector: 'app-resolver-solicitud',
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
          <h2>Resolver solicitud</h2>
          <p class="resumen">Revisa las solicitudes y decide si se aprueban o se rechazan.</p>
        </div>
        <label class="filtro">
          Estado
          <select [value]="estadoFiltro()" (change)="cambiarEstadoFiltro($event)">
            <option value="PENDIENTE">Pendientes</option>
            <option value="TODAS">Todos los estados</option>
            <option value="APROBADO">Aprobadas</option>
            <option value="RECHAZADA">Rechazadas</option>
            <option value="CANCELADO">Canceladas</option>
            <option value="EXPIRADA">Expiradas</option>
            <option value="COMPLETADA">Completadas</option>
          </select>
        </label>
      </header>

      <p class="total">{{ paginaActual()?.totalElementos ?? 0 }} solicitudes</p>

      @if (cargando()) {
        <p class="estado" role="status">Cargando solicitudes...</p>
      } @else if (errorCarga()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorCarga() }}</p>
          <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (solicitudes().length === 0) {
        <p class="estado">No hay solicitudes para el estado seleccionado.</p>
      } @else {
        <app-tabla
          [filas]="filas()"
          [columnas]="columnas"
          [tamanoPagina]="TAMANO_PAGINA"
          textoVacio="No hay solicitudes para mostrar."
        />
        @if (paginaActual() && paginaActual()!.totalPaginas > 1) {
          <nav class="paginacion" aria-label="Paginación de solicitudes">
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

        <section class="resolucion" aria-labelledby="titulo-resolucion">
          <h3 id="titulo-resolucion">Decisión sobre una solicitud</h3>
          <label class="selector">
            Solicitud
            <select
              [value]="solicitudSeleccionadaId() ?? ''"
              (change)="cambiarSolicitudSeleccionada($event)"
            >
              <option value="">Selecciona una solicitud</option>
              @for (solicitud of solicitudes(); track solicitud.id) {
                <option [value]="solicitud.id">
                  #{{ solicitud.id }} · {{ solicitud.loteNombre }} ·
                  {{ solicitud.organizacionNombre }} · {{ etiquetaEstado(solicitud.estado) }}
                </option>
              }
            </select>
          </label>
          @if (seleccionTocada() && solicitudSeleccionadaId() === null) {
            <small class="error-carga" role="alert">Selecciona una solicitud.</small>
          }

          @if (solicitudSeleccionada(); as solicitud) {
            <article class="detalle">
              <h4>Solicitud #{{ solicitud.id }} · {{ etiquetaEstado(solicitud.estado) }}</h4>
              <dl>
                <div><dt>Lote</dt><dd>{{ solicitud.loteNombre }} (#{{ solicitud.loteId }})</dd></div>
                <div>
                  <dt>Organización</dt>
                  <dd>{{ solicitud.organizacionNombre }} (#{{ solicitud.organizacionId }})</dd>
                </div>
                <div>
                  <dt>Cantidad solicitada</dt>
                  <dd>{{ solicitud.cantidadSolicitada }} {{ solicitud.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Fecha de creación</dt>
                  <dd>{{ solicitud.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}</dd>
                </div>
                @if (solicitud.fechaLimiteConfirmacion) {
                  <div>
                    <dt>Límite de confirmación</dt>
                    <dd>{{ solicitud.fechaLimiteConfirmacion | date: 'dd/MM/yyyy HH:mm' }}</dd>
                  </div>
                }
                @if (solicitud.fechaResolucion) {
                  <div>
                    <dt>Fecha de resolución</dt>
                    <dd>{{ solicitud.fechaResolucion | date: 'dd/MM/yyyy HH:mm' }}</dd>
                  </div>
                }
                @if (solicitud.motivoResolucion) {
                  <div><dt>Motivo</dt><dd>{{ solicitud.motivoResolucion }}</dd></div>
                }
                <div><dt>En empate</dt><dd>{{ solicitud.enEmpate ? 'Sí' : 'No' }}</dd></div>
              </dl>

              @if (solicitud.estado === 'PENDIENTE') {
                <form [formGroup]="form" (ngSubmit)="solicitarConfirmacion()">
                  <fieldset>
                    <legend>Decisión</legend>
                    <label class="opcion">
                      <input type="radio" formControlName="decision" value="aprobar" />
                      Aprobar
                    </label>
                    <label class="opcion">
                      <input type="radio" formControlName="decision" value="rechazar" />
                      Rechazar
                    </label>
                  </fieldset>
                  @if (form.controls.decision.touched && form.controls.decision.invalid) {
                    <small class="error-carga" role="alert">Selecciona aprobar o rechazar.</small>
                  }

                  @if (form.controls.decision.value === 'rechazar') {
                    <label class="motivo">
                      Motivo del rechazo
                      <textarea
                        rows="3"
                        maxlength="500"
                        formControlName="motivo"
                        aria-describedby="ayuda-motivo"
                      ></textarea>
                    </label>
                    <small id="ayuda-motivo" class="ayuda">Obligatorio al rechazar; máximo 500 caracteres.</small>
                    @if (motivoObligatorio()) {
                      <small class="error-carga" role="alert">El motivo es obligatorio al rechazar.</small>
                    }
                    @if (form.controls.motivo.touched && form.controls.motivo.hasError('maxlength')) {
                      <small class="error-carga" role="alert">El motivo no puede superar 500 caracteres.</small>
                    }
                  }

                  <button
                    type="submit"
                    [disabled]="guardando()"
                  >
                    {{ guardando() ? 'Enviando...' : 'Continuar' }}
                  </button>
                </form>
              } @else {
                <p class="estado">Solo se pueden resolver solicitudes pendientes.</p>
              }
            </article>
          }
        </section>
      }

      <app-dialogo-confirmacion
        [abierto]="dialogoAbierto()"
        [titulo]="tituloDialogo()"
        [mensaje]="mensajeDialogo()"
        [textoConfirmar]="textoConfirmar()"
        (confirmado)="confirmarResolucion()"
        (cancelado)="cerrarDialogo()"
      />
      <app-indicador-carga [visible]="guardando()" texto="Guardando resolución..." />
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
        margin-bottom: 8px;
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
        margin: 0 0 14px;
        font-size: var(--texto-sm);
      }
      .filtro,
      .selector,
      .motivo {
        display: grid;
        gap: 6px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      select,
      textarea {
        width: min(100%, 560px);
        min-height: 42px;
        padding: 9px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
      }
      .selector {
        margin: 14px 0;
      }
      .estado {
        padding: 14px 0;
      }
      .error-carga {
        color: var(--color-error);
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
      .paginacion {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 0 24px;
      }
      .resolucion {
        margin-top: 24px;
        padding: clamp(18px, 2vw, 24px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
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
        gap: 9px;
        margin-top: 18px;
      }
      fieldset {
        display: flex;
        gap: 18px;
        padding: 10px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        color: var(--color-texto);
      }
      legend {
        padding: 0 5px;
        font-size: var(--texto-sm);
      }
      input[type='radio'] {
        accent-color: var(--color-acento);
      }
      .opcion {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .motivo {
        width: min(100%, 560px);
        margin-top: 4px;
      }
      textarea {
        resize: vertical;
      }
      @media (max-width: 600px) {
        .cabecera {
          align-items: flex-start;
          flex-direction: column;
        }
        .filtro,
        .filtro select {
          width: 100%;
        }
        fieldset {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ResolverSolicitud implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    decision: this.fb.nonNullable.control<Decision>('', Validators.required),
    motivo: ['', Validators.maxLength(500)],
  });

  readonly pagina = signal(0);
  readonly estadoFiltro = signal<FiltroEstado>('PENDIENTE');
  readonly paginaActual = signal<PaginaCoordinador<SolicitudDto> | null>(null);
  readonly solicitudes = signal<SolicitudDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  readonly solicitudSeleccionadaId = signal<number | null>(null);
  readonly seleccionTocada = signal(false);
  readonly motivoObligatorio = signal(false);
  readonly dialogoAbierto = signal(false);
  readonly guardando = signal(false);

  readonly solicitudSeleccionada = computed(
    () => this.solicitudes().find((solicitud) => solicitud.id === this.solicitudSeleccionadaId()) ?? null,
  );

  readonly filas = computed<FilaSolicitud[]>(() =>
    this.solicitudes().map((solicitud) => ({
      id: `#${solicitud.id}`,
      lote: `${solicitud.loteNombre} (#${solicitud.loteId})`,
      organizacion: solicitud.organizacionNombre,
      cantidad: `${solicitud.cantidadSolicitada} ${solicitud.unidadMedida}`,
      estado: this.etiquetaEstado(solicitud.estado),
      empate: solicitud.enEmpate ? 'Sí' : 'No',
      fecha: this.formatearFecha(solicitud.fechaCreacion),
      limite: solicitud.fechaLimiteConfirmacion
        ? this.formatearFecha(solicitud.fechaLimiteConfirmacion)
        : '—',
    })),
  );

  readonly columnas: ColumnaTabla<FilaSolicitud>[] = [
    { titulo: 'Solicitud', clave: 'id' },
    { titulo: 'Lote', clave: 'lote' },
    { titulo: 'Organización', clave: 'organizacion' },
    { titulo: 'Cantidad', clave: 'cantidad' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'En empate', clave: 'empate' },
    { titulo: 'Creada', clave: 'fecha' },
    { titulo: 'Límite', clave: 'limite' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    const parametros = new URLSearchParams();
    const estado = this.estadoFiltro();
    if (estado !== 'TODAS') {
      parametros.set('estado', estado);
    }
    parametros.set('page', String(this.pagina()));
    parametros.set('size', String(TAMANO_PAGINA));
    parametros.set('sort', ORDEN_PAGINA);

    this.api.get<PaginaCoordinador<SolicitudDto>>(`solicitudes?${parametros.toString()}`).subscribe({
      next: (pagina) => {
        this.paginaActual.set(pagina);
        this.solicitudes.set(pagina.contenido);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.paginaActual.set(null);
        this.solicitudes.set([]);
        this.cargando.set(false);
        const mensaje = this.mensajeError(error, 'No se pudieron cargar las solicitudes.');
        this.errorCarga.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cambiarEstadoFiltro(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement) || !esFiltroEstado(elemento.value)) {
      return;
    }
    this.estadoFiltro.set(elemento.value);
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

  cambiarSolicitudSeleccionada(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    this.solicitudSeleccionadaId.set(Number.isInteger(id) && id > 0 ? id : null);
    this.seleccionTocada.set(true);
    this.motivoObligatorio.set(false);
    this.dialogoAbierto.set(false);
    this.form.reset({ decision: '', motivo: '' });
  }

  solicitarConfirmacion(): void {
    const solicitud = this.solicitudSeleccionada();
    if (!solicitud) {
      this.seleccionTocada.set(true);
      return;
    }
    if (solicitud.estado !== 'PENDIENTE') {
      return;
    }

    this.form.markAllAsTouched();
    this.motivoObligatorio.set(false);
    if (this.form.invalid) {
      return;
    }
    if (this.form.controls.decision.value === 'rechazar' && !this.form.controls.motivo.value.trim()) {
      this.motivoObligatorio.set(true);
      return;
    }
    this.dialogoAbierto.set(true);
  }

  confirmarResolucion(): void {
    const solicitud = this.solicitudSeleccionada();
    const decision = this.form.controls.decision.value;
    const motivo = this.form.controls.motivo.value.trim();
    if (
      !solicitud ||
      solicitud.estado !== 'PENDIENTE' ||
      (decision !== 'aprobar' && decision !== 'rechazar') ||
      (decision === 'rechazar' && !motivo) ||
      this.form.controls.motivo.invalid ||
      this.guardando()
    ) {
      this.dialogoAbierto.set(false);
      this.solicitarConfirmacion();
      return;
    }

    const aprobada = decision === 'aprobar';
    const cuerpo: ResolverSolicitudRequest = {
      aprobada,
      motivo: motivo || null,
    };
    this.dialogoAbierto.set(false);
    this.guardando.set(true);

    this.api.patch<ResolverSolicitudRequest, SolicitudDto>(
      `solicitudes/${solicitud.id}/resolver`,
      cuerpo,
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensajes.exito(
          `Solicitud #${solicitud.id} ${aprobada ? 'aprobada' : 'rechazada'}.`,
        );
        this.limpiarSeleccion();
        this.cargar();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.mensajes.error(
          this.mensajeError(error, 'No se pudo resolver la solicitud.'),
        );
      },
    });
  }

  cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
  }

  tituloDialogo(): string {
    return this.form.controls.decision.value === 'aprobar'
      ? 'Confirmar aprobación'
      : 'Confirmar rechazo';
  }

  mensajeDialogo(): string {
    const solicitud = this.solicitudSeleccionada();
    if (!solicitud) {
      return 'Selecciona una solicitud pendiente.';
    }
    const accion = this.form.controls.decision.value === 'aprobar' ? 'aprobar' : 'rechazar';
    return `¿Confirmas ${accion} la solicitud #${solicitud.id} de ${solicitud.organizacionNombre}?`;
  }

  textoConfirmar(): string {
    return this.form.controls.decision.value === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud';
  }

  etiquetaEstado(estado: EstadoSolicitud): string {
    const etiquetas: Record<EstadoSolicitud, string> = {
      APROBADO: 'Aprobada',
      CANCELADO: 'Cancelada',
      PENDIENTE: 'Pendiente',
      RECHAZADA: 'Rechazada',
      EXPIRADA: 'Expirada',
      COMPLETADA: 'Completada',
    };
    return etiquetas[estado];
  }

  private limpiarSeleccion(): void {
    this.solicitudSeleccionadaId.set(null);
    this.seleccionTocada.set(false);
    this.motivoObligatorio.set(false);
    this.dialogoAbierto.set(false);
    this.form.reset({ decision: '', motivo: '' });
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
