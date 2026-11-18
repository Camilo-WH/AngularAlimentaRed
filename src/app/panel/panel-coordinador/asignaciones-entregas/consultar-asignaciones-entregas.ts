import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/api.service';
import {
  AsignacionDto,
  EntregaDto,
  ErrorApiCoordinador,
  EstadoAsignacion,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';
import { forkJoin } from 'rxjs';

interface FilaAsignacion {
  id: string;
  solicitud: string;
  lote: string;
  organizacion: string;
  asignada: string;
  retirada: string;
  pendiente: string;
  estado: string;
  fechaLimite: string;
}

interface FilaEntrega {
  id: string;
  cantidad: string;
  estado: string;
  fecha: string;
  responsable: string;
  fueraDeFranja: string;
  observaciones: string;
}

const TAMANO_PAGINA = 20;
const ORDEN_PAGINA = 'fechaAsignacion,desc';

@Component({
  selector: 'app-consultar-asignaciones-entregas',
  standalone: true,
  imports: [DatePipe, IndicadorCargaComponent, TablaComponent],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Consultar asignaciones y entregas</h2>
          <p class="resumen">
            Asignaciones visibles para coordinación, ordenadas por fecha de asignación.
          </p>
        </div>
        <span class="total">{{ paginaActual()?.totalElementos ?? 0 }} asignaciones</span>
      </header>

      @if (cargando()) {
        <p class="estado" role="status">Cargando asignaciones...</p>
      } @else if (errorCarga()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorCarga() }}</p>
          <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (asignaciones().length === 0) {
        <p class="estado">No hay asignaciones para mostrar.</p>
      } @else {
        <app-tabla
          [filas]="filasAsignacion()"
          [columnas]="columnasAsignacion"
          [tamanoPagina]="TAMANO_PAGINA"
          textoVacio="No hay asignaciones para mostrar."
        />

        @if (paginaActual() && paginaActual()!.totalPaginas > 1) {
          <nav class="paginacion" aria-label="Paginación de asignaciones">
            <button
              type="button"
              class="secundario"
              [disabled]="pagina() === 0 || cargando()"
              (click)="irAPagina(pagina() - 1)"
            >
              Anterior
            </button>
            <span>
              Página {{ paginaActual()!.pagina + 1 }} de {{ paginaActual()!.totalPaginas }}
            </span>
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

        <section class="consulta-detalle" aria-labelledby="titulo-detalle">
          <h3 id="titulo-detalle">Detalle de asignación y retiros</h3>
          <div class="selector">
            <label for="asignacion">Asignación de la página</label>
            <select
              id="asignacion"
              [value]="asignacionSeleccionadaId() ?? ''"
              (change)="cambiarSeleccion($event)"
            >
              <option value="">Selecciona una asignación</option>
              @for (asignacion of asignaciones(); track asignacion.id) {
                <option [value]="asignacion.id">
                  #{{ asignacion.id }} · {{ asignacion.loteNombre }} ·
                  {{ asignacion.organizacionNombre }}
                </option>
              }
            </select>
            <button
              type="button"
              [disabled]="asignacionSeleccionadaId() === null || cargandoDetalle()"
              (click)="consultarDetalle()"
            >
              Consultar
            </button>
          </div>

          @if (errorDetalle()) {
            <p class="estado error-carga" role="alert">{{ errorDetalle() }}</p>
          } @else if (detalle(); as asignacion) {
            <article class="detalle">
              <h4>Asignación #{{ asignacion.id }} · {{ asignacion.estado }}</h4>
              <dl>
                <div><dt>Solicitud</dt><dd>#{{ asignacion.solicitudId }}</dd></div>
                <div><dt>Lote</dt><dd>{{ asignacion.loteNombre }} (#{{ asignacion.loteId }})</dd></div>
                <div><dt>Organización receptora</dt><dd>{{ asignacion.organizacionNombre }}</dd></div>
                <div><dt>Donante</dt><dd>{{ asignacion.donanteNombre }}</dd></div>
                <div>
                  <dt>Cantidad asignada</dt>
                  <dd>{{ asignacion.cantidadAsignada }} {{ asignacion.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Cantidad retirada</dt>
                  <dd>{{ asignacion.cantidadRetirada }} {{ asignacion.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Cantidad pendiente</dt>
                  <dd>{{ asignacion.cantidadPendiente }} {{ asignacion.unidadMedida }}</dd>
                </div>
                <div>
                  <dt>Fecha de asignación</dt>
                  <dd>{{ asignacion.fechaAsignacion | date: 'dd/MM/yyyy HH:mm' }}</dd>
                </div>
                <div>
                  <dt>Fecha límite de retiro</dt>
                  <dd>{{ asignacion.fechaLimiteRetiro | date: 'dd/MM/yyyy HH:mm' }}</dd>
                </div>
                @if (asignacion.fechaCierre) {
                  <div>
                    <dt>Fecha de cierre</dt>
                    <dd>{{ asignacion.fechaCierre | date: 'dd/MM/yyyy HH:mm' }}</dd>
                  </div>
                }
                @if (asignacion.ubicacion) {
                  <div><dt>Ubicación</dt><dd>{{ asignacion.ubicacion }}</dd></div>
                }
                @if (asignacion.instruccionesRecogida) {
                  <div>
                    <dt>Instrucciones de recogida</dt>
                    <dd>{{ asignacion.instruccionesRecogida }}</dd>
                  </div>
                }
                @if (asignacion.contacto) {
                  <div><dt>Contacto</dt><dd>{{ asignacion.contacto }}</dd></div>
                }
              </dl>

              <h4>Retiros registrados</h4>
              @if (retiros().length === 0) {
                <p class="estado">Esta asignación aún no tiene retiros registrados.</p>
              } @else {
                <app-tabla
                  [filas]="filasEntrega()"
                  [columnas]="columnasEntrega"
                  [tamanoPagina]="TAMANO_PAGINA"
                  textoVacio="No hay retiros registrados."
                />
              }
            </article>
          }
        </section>
      }

      <app-indicador-carga
        [visible]="cargando() || cargandoDetalle()"
        [texto]="cargando() ? 'Cargando asignaciones...' : 'Cargando detalle y retiros...'"
      />
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
        margin-bottom: 16px;
      }
      .resumen,
      .estado {
        color: #647168;
      }
      .resumen {
        margin: 5px 0 0;
      }
      .total {
        color: #647168;
        font-size: 14px;
        white-space: nowrap;
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
      .consulta-detalle {
        margin-top: 24px;
        padding: 18px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
      }
      .selector {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin: 14px 0;
      }
      select {
        min-width: min(420px, 100%);
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        background: #fff;
        color: #1f2a22;
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
      .detalle {
        margin-top: 18px;
      }
      .detalle h4 {
        margin: 20px 0 12px;
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
      @media (max-width: 600px) {
        .cabecera {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ConsultarAsignacionesEntregas implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);

  readonly pagina = signal(0);
  readonly paginaActual = signal<PaginaCoordinador<AsignacionDto> | null>(null);
  readonly asignaciones = signal<AsignacionDto[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal<string | null>(null);

  readonly asignacionSeleccionadaId = signal<number | null>(null);
  readonly detalle = signal<AsignacionDto | null>(null);
  readonly retiros = signal<EntregaDto[]>([]);
  readonly cargandoDetalle = signal(false);
  readonly errorDetalle = signal<string | null>(null);

  readonly columnasAsignacion: ColumnaTabla<FilaAsignacion>[] = [
    { titulo: 'Asignación', clave: 'id' },
    { titulo: 'Solicitud', clave: 'solicitud' },
    { titulo: 'Lote', clave: 'lote' },
    { titulo: 'Organización receptora', clave: 'organizacion' },
    { titulo: 'Asignada', clave: 'asignada' },
    { titulo: 'Retirada', clave: 'retirada' },
    { titulo: 'Pendiente', clave: 'pendiente' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Límite de retiro', clave: 'fechaLimite' },
  ];

  readonly columnasEntrega: ColumnaTabla<FilaEntrega>[] = [
    { titulo: 'Retiro', clave: 'id' },
    { titulo: 'Cantidad', clave: 'cantidad' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Fecha', clave: 'fecha' },
    { titulo: 'Responsable', clave: 'responsable' },
    { titulo: 'Fuera de franja', clave: 'fueraDeFranja' },
    { titulo: 'Observaciones', clave: 'observaciones' },
  ];

  readonly filasAsignacion = computed<FilaAsignacion[]>(() =>
    this.asignaciones().map((asignacion) => ({
      id: `#${asignacion.id}`,
      solicitud: `#${asignacion.solicitudId}`,
      lote: asignacion.loteNombre,
      organizacion: asignacion.organizacionNombre,
      asignada: `${asignacion.cantidadAsignada} ${asignacion.unidadMedida}`,
      retirada: `${asignacion.cantidadRetirada} ${asignacion.unidadMedida}`,
      pendiente: `${asignacion.cantidadPendiente} ${asignacion.unidadMedida}`,
      estado: this.etiquetaEstado(asignacion.estado),
      fechaLimite: this.formatearFecha(asignacion.fechaLimiteRetiro),
    })),
  );

  readonly filasEntrega = computed<FilaEntrega[]>(() =>
    this.retiros().map((retiro) => ({
      id: `#${retiro.id}`,
      cantidad: `${retiro.cantidadRetirada} ${retiro.unidadMedida}`,
      estado: retiro.estado === 'COMPLETA' ? 'Completa' : 'Parcial',
      fecha: this.formatearFecha(retiro.fechaEntrega),
      responsable: retiro.responsable ?? '—',
      fueraDeFranja: retiro.fueraDeFranja ? 'Sí' : 'No',
      observaciones: retiro.observaciones ?? '—',
    })),
  );

  ngOnInit(): void {
    this.cargar();
  }

  irAPagina(numero: number): void {
    const pagina = this.paginaActual();
    if (numero < 0 || (pagina && numero >= pagina.totalPaginas) || numero === this.pagina()) {
      return;
    }
    this.pagina.set(numero);
    this.limpiarDetalle();
    this.cargar();
  }

  cambiarSeleccion(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    this.asignacionSeleccionadaId.set(Number.isInteger(id) && id > 0 ? id : null);
    this.limpiarDetalle();
  }

  consultarDetalle(): void {
    const id = this.asignacionSeleccionadaId();
    if (id === null || this.cargandoDetalle()) {
      return;
    }

    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    forkJoin({
      asignacion: this.api.get<AsignacionDto>(`entregas/asignaciones/${id}`),
      retiros: this.api.get<EntregaDto[]>(`entregas/asignaciones/${id}/retiros`),
    }).subscribe({
      next: ({ asignacion, retiros }) => {
        this.detalle.set(asignacion);
        this.retiros.set(retiros);
        this.cargandoDetalle.set(false);
        this.mensajes.exito(`Detalle de la asignación #${id} cargado.`);
        this.cargar();
      },
      error: (error: unknown) => {
        this.cargandoDetalle.set(false);
        const mensaje = this.mensajeError(
          error,
          'No se pudo cargar el detalle o los retiros de la asignación.',
        );
        this.errorDetalle.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    const ruta = `entregas/asignaciones?page=${this.pagina()}&size=${TAMANO_PAGINA}&sort=${ORDEN_PAGINA}`;

    this.api.get<PaginaCoordinador<AsignacionDto>>(ruta).subscribe({
      next: (pagina) => {
        this.paginaActual.set(pagina);
        this.asignaciones.set(pagina.contenido);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.paginaActual.set(null);
        this.asignaciones.set([]);
        this.cargando.set(false);
        const mensaje = this.mensajeError(error, 'No se pudieron cargar las asignaciones.');
        this.errorCarga.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  private limpiarDetalle(): void {
    this.detalle.set(null);
    this.retiros.set([]);
    this.errorDetalle.set(null);
  }

  private etiquetaEstado(estado: EstadoAsignacion): string {
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
