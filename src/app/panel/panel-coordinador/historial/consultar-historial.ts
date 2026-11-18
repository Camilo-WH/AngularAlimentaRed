import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  CategoriaCoordinadorDto,
  EntregaDto,
  ErrorApiCoordinador,
  HistorialEstadoDto,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

interface FilaEntrega {
  id: string;
  fecha: string;
  lote: string;
  categoria: string;
  donante: string;
  receptora: string;
  cantidad: string;
  estado: string;
  fueraDeFranja: string;
  responsable: string;
}

interface FilaHistorialEstado {
  fecha: string;
  entidad: string;
  estadoAnterior: string;
  estadoNuevo: string;
  responsable: string;
  justificacion: string;
}

const TAMANO_PAGINA = 20;
const ORDEN_PAGINA = 'fechaEntrega,desc';

@Component({
  selector: 'app-consultar-historial',
  standalone: true,
  imports: [IndicadorCargaComponent, ReactiveFormsModule, TablaComponent],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Consultar historial</h2>
          <p class="resumen">Entregas registradas, con filtros opcionales por fecha y categoría.</p>
        </div>
        <span class="total">{{ paginaActual()?.totalElementos ?? 0 }} entregas</span>
      </header>

      <form class="filtros" [formGroup]="filtros" (ngSubmit)="aplicarFiltros()">
        <label>
          Desde
          <input type="date" formControlName="desde" />
        </label>
        <label>
          Hasta
          <input type="date" formControlName="hasta" />
        </label>
        <label>
          Categoría
          <select formControlName="categoriaId">
            <option value="">Todas</option>
            @for (categoria of categorias(); track categoria.id) {
              <option [value]="categoria.id">{{ categoria.nombre }}</option>
            }
          </select>
        </label>
        <div class="acciones-filtro">
          <button type="submit" [disabled]="cargandoHistorial()">Aplicar filtros</button>
          <button
            type="button"
            class="secundario"
            [disabled]="cargandoHistorial()"
            (click)="limpiarFiltros()"
          >
            Limpiar
          </button>
        </div>
        @if (errorCategorias()) {
          <div class="error-categorias" role="alert">
            <span>{{ errorCategorias() }}</span>
            <button type="button" class="secundario" (click)="cargarCategorias()">Reintentar</button>
          </div>
        }
      </form>

      @if (cargandoHistorial()) {
        <p class="estado" role="status">Cargando historial...</p>
      } @else if (errorHistorial()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorHistorial() }}</p>
          <button type="button" class="secundario" (click)="cargarHistorial()">
            Reintentar
          </button>
        </div>
      } @else if (entregas().length === 0) {
        <p class="estado">No hay entregas para los filtros seleccionados.</p>
      } @else {
        <app-tabla
          [filas]="filasEntrega()"
          [columnas]="columnasEntrega"
          [tamanoPagina]="TAMANO_PAGINA"
          textoVacio="No hay entregas para mostrar."
        />

        @if (paginaActual() && paginaActual()!.totalPaginas > 1) {
          <nav class="paginacion" aria-label="Paginación del historial">
            <button
              type="button"
              class="secundario"
              [disabled]="pagina() === 0 || cargandoHistorial()"
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
              [disabled]="paginaActual()!.ultima || cargandoHistorial()"
              (click)="irAPagina(pagina() + 1)"
            >
              Siguiente
            </button>
          </nav>
        }

        <section class="trazabilidad" aria-labelledby="titulo-trazabilidad">
          <h3 id="titulo-trazabilidad">Historial de estados</h3>
          <p class="resumen">
            Selecciona una entrega para consultar la trazabilidad de su solicitud o de su lote.
          </p>
          <label class="selector">
            Entrega de referencia
            <select
              [value]="entregaSeleccionadaId() ?? ''"
              (change)="cambiarEntregaSeleccionada($event)"
            >
              <option value="">Selecciona una entrega</option>
              @for (entrega of entregas(); track entrega.id) {
                <option [value]="entrega.id">
                  Entrega #{{ entrega.id }} · solicitud #{{ entrega.solicitudId }} ·
                  lote #{{ entrega.loteId }}
                </option>
              }
            </select>
          </label>
          @if (seleccionTocada() && entregaSeleccionadaId() === null) {
            <small class="error-carga" role="alert">Selecciona una entrega para consultar su historial.</small>
          }
          <div class="acciones-trazabilidad">
            <button
              type="button"
              [disabled]="entregaSeleccionadaId() === null || cargandoTrazabilidad()"
              (click)="consultarHistorialSolicitud()"
            >
              Historial de solicitud
            </button>
            <button
              type="button"
              class="secundario"
              [disabled]="entregaSeleccionadaId() === null || cargandoTrazabilidad()"
              (click)="consultarHistorialLote()"
            >
              Historial de lote
            </button>
          </div>

          @if (errorTrazabilidad()) {
            <p class="estado error-carga" role="alert">{{ errorTrazabilidad() }}</p>
          } @else if (trazabilidad(); as eventos) {
            @if (eventos.length === 0) {
              <p class="estado">No hay cambios de estado registrados.</p>
            } @else {
              <app-tabla
                [filas]="filasTrazabilidad()"
                [columnas]="columnasTrazabilidad"
                [tamanoPagina]="TAMANO_PAGINA"
                textoVacio="No hay cambios de estado registrados."
              />
            }
          }
        </section>
      }

      <app-indicador-carga
        [visible]="cargandoHistorial() || cargandoCategorias() || cargandoTrazabilidad()"
        [texto]="textoCarga()"
      />
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
      .cabecera {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      .resumen,
      .estado {
        color: var(--color-texto-secundario);
      }
      .resumen {
        margin: 5px 0 0;
      }
      .total {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
        white-space: nowrap;
      }
      .filtros {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 14px;
        margin-bottom: 20px;
        padding: 18px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }
      label {
        display: grid;
        gap: 6px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      input,
      select {
        min-height: 42px;
        min-width: 180px;
        padding: 8px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
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
      .acciones-filtro,
      .acciones-trazabilidad {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .error-categorias {
        display: flex;
        flex-basis: 100%;
        align-items: center;
        gap: 10px;
        color: var(--color-error);
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
      .trazabilidad {
        display: grid;
        gap: 12px;
        margin-top: 24px;
        padding: clamp(18px, 2vw, 24px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }
      .selector {
        max-width: 560px;
      }
      .selector select {
        width: 100%;
      }
      @media (max-width: 600px) {
        .cabecera {
          align-items: flex-start;
          flex-direction: column;
        }
        .filtros {
          align-items: stretch;
          flex-direction: column;
        }
        .filtros label,
        .filtros input,
        .filtros select {
          width: 100%;
        }
      }
    `,
  ],
})
export class ConsultarHistorial implements OnInit {
  readonly TAMANO_PAGINA = TAMANO_PAGINA;

  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly filtros = this.fb.nonNullable.group({
    desde: [''],
    hasta: [''],
    categoriaId: [''],
  });

  readonly pagina = signal(0);
  readonly paginaActual = signal<PaginaCoordinador<EntregaDto> | null>(null);
  readonly entregas = signal<EntregaDto[]>([]);
  readonly categorias = signal<CategoriaCoordinadorDto[]>([]);
  readonly cargandoHistorial = signal(false);
  readonly cargandoCategorias = signal(false);
  readonly errorHistorial = signal<string | null>(null);
  readonly errorCategorias = signal<string | null>(null);

  readonly entregaSeleccionadaId = signal<number | null>(null);
  readonly seleccionTocada = signal(false);
  readonly trazabilidad = signal<HistorialEstadoDto[] | null>(null);
  readonly cargandoTrazabilidad = signal(false);
  readonly errorTrazabilidad = signal<string | null>(null);

  readonly columnasEntrega: ColumnaTabla<FilaEntrega>[] = [
    { titulo: 'Entrega', clave: 'id' },
    { titulo: 'Fecha', clave: 'fecha' },
    { titulo: 'Lote', clave: 'lote' },
    { titulo: 'Categoría', clave: 'categoria' },
    { titulo: 'Donante', clave: 'donante' },
    { titulo: 'Organización receptora', clave: 'receptora' },
    { titulo: 'Cantidad', clave: 'cantidad' },
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Fuera de franja', clave: 'fueraDeFranja' },
    { titulo: 'Responsable', clave: 'responsable' },
  ];

  readonly columnasTrazabilidad: ColumnaTabla<FilaHistorialEstado>[] = [
    { titulo: 'Fecha', clave: 'fecha' },
    { titulo: 'Entidad', clave: 'entidad' },
    { titulo: 'Estado anterior', clave: 'estadoAnterior' },
    { titulo: 'Estado nuevo', clave: 'estadoNuevo' },
    { titulo: 'Responsable', clave: 'responsable' },
    { titulo: 'Justificación', clave: 'justificacion' },
  ];

  readonly filasEntrega = computed<FilaEntrega[]>(() =>
    this.entregas().map((entrega) => ({
      id: `#${entrega.id}`,
      fecha: this.formatearFecha(entrega.fechaEntrega),
      lote: `${entrega.loteNombre} (#${entrega.loteId})`,
      categoria: entrega.categoriaNombre,
      donante: entrega.donanteNombre,
      receptora: entrega.receptoraNombre,
      cantidad: `${entrega.cantidadRetirada} ${entrega.unidadMedida}`,
      estado: entrega.estado === 'COMPLETA' ? 'Completa' : 'Parcial',
      fueraDeFranja: entrega.fueraDeFranja ? 'Sí' : 'No',
      responsable: entrega.responsable ?? '—',
    })),
  );

  readonly filasTrazabilidad = computed<FilaHistorialEstado[]>(() =>
    (this.trazabilidad() ?? []).map((evento) => ({
      fecha: this.formatearFecha(evento.fecha),
      entidad: this.etiquetaEntidad(evento.entidad),
      estadoAnterior: evento.estadoAnterior ?? '—',
      estadoNuevo: evento.estadoNuevo,
      responsable: evento.responsable ?? '—',
      justificacion: evento.justificacion ?? '—',
    })),
  );

  readonly textoCarga = computed(() => {
    if (this.cargandoTrazabilidad()) {
      return 'Cargando historial de estados...';
    }
    if (this.cargandoCategorias()) {
      return 'Cargando categorías...';
    }
    return 'Cargando entregas...';
  });

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarHistorial();
  }

  aplicarFiltros(): void {
    this.pagina.set(0);
    this.limpiarTrazabilidad();
    this.cargarHistorial(true);
  }

  limpiarFiltros(): void {
    this.filtros.reset({ desde: '', hasta: '', categoriaId: '' });
    this.aplicarFiltros();
  }

  irAPagina(numero: number): void {
    const pagina = this.paginaActual();
    if (numero < 0 || (pagina && numero >= pagina.totalPaginas) || numero === this.pagina()) {
      return;
    }
    this.pagina.set(numero);
    this.limpiarTrazabilidad();
    this.cargarHistorial();
  }

  cargarHistorial(mostrarExito = false): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.api.get<PaginaCoordinador<EntregaDto>>(this.rutaHistorial()).subscribe({
      next: (pagina) => {
        this.paginaActual.set(pagina);
        this.entregas.set(pagina.contenido);
        this.cargandoHistorial.set(false);
        if (mostrarExito) {
          this.mensajes.exito('Historial actualizado.');
        }
      },
      error: (error: unknown) => {
        this.paginaActual.set(null);
        this.entregas.set([]);
        this.cargandoHistorial.set(false);
        const mensaje = this.mensajeError(error, 'No se pudo cargar el historial de entregas.');
        this.errorHistorial.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cargarCategorias(): void {
    this.cargandoCategorias.set(true);
    this.errorCategorias.set(null);
    this.api.get<CategoriaCoordinadorDto[]>('categorias').subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.cargandoCategorias.set(false);
      },
      error: (error: unknown) => {
        this.categorias.set([]);
        this.cargandoCategorias.set(false);
        const mensaje = this.mensajeError(error, 'No se pudieron cargar las categorías.');
        this.errorCategorias.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  cambiarEntregaSeleccionada(evento: Event): void {
    const elemento = evento.target;
    if (!(elemento instanceof HTMLSelectElement)) {
      return;
    }
    const id = Number(elemento.value);
    this.entregaSeleccionadaId.set(Number.isInteger(id) && id > 0 ? id : null);
    this.seleccionTocada.set(true);
    this.trazabilidad.set(null);
    this.errorTrazabilidad.set(null);
  }

  consultarHistorialSolicitud(): void {
    this.consultarTrazabilidad('solicitud');
  }

  consultarHistorialLote(): void {
    this.consultarTrazabilidad('lote');
  }

  private consultarTrazabilidad(tipo: 'solicitud' | 'lote'): void {
    this.seleccionTocada.set(true);
    const idEntrega = this.entregaSeleccionadaId();
    const entrega = this.entregas().find((item) => item.id === idEntrega);
    if (!entrega || this.cargandoTrazabilidad()) {
      return;
    }

    const idEntidad = tipo === 'solicitud' ? entrega.solicitudId : entrega.loteId;
    const ruta = `${tipo === 'solicitud' ? 'solicitudes' : 'lotes'}/${idEntidad}/historial`;
    this.cargandoTrazabilidad.set(true);
    this.errorTrazabilidad.set(null);
    this.trazabilidad.set(null);

    this.api.get<HistorialEstadoDto[]>(ruta).subscribe({
      next: (eventos) => {
        this.trazabilidad.set(eventos);
        this.cargandoTrazabilidad.set(false);
        const tipoEntidad = tipo === 'solicitud' ? 'solicitud' : 'lote';
        this.mensajes.exito(`Historial de ${tipoEntidad} #${idEntidad} cargado.`);
      },
      error: (error: unknown) => {
        this.cargandoTrazabilidad.set(false);
        const mensaje = this.mensajeError(error, 'No se pudo cargar el historial de estados.');
        this.errorTrazabilidad.set(mensaje);
        this.mensajes.error(mensaje);
      },
    });
  }

  private rutaHistorial(): string {
    const valores = this.filtros.getRawValue();
    const parametros = new URLSearchParams();
    if (valores.desde) {
      parametros.set('desde', valores.desde);
    }
    if (valores.hasta) {
      parametros.set('hasta', valores.hasta);
    }
    if (valores.categoriaId) {
      parametros.set('categoriaId', valores.categoriaId);
    }
    parametros.set('page', String(this.pagina()));
    parametros.set('size', String(TAMANO_PAGINA));
    parametros.set('sort', ORDEN_PAGINA);
    return `reportes/historial?${parametros.toString()}`;
  }

  private limpiarTrazabilidad(): void {
    this.entregaSeleccionadaId.set(null);
    this.seleccionTocada.set(false);
    this.trazabilidad.set(null);
    this.errorTrazabilidad.set(null);
  }

  private etiquetaEntidad(entidad: HistorialEstadoDto['entidad']): string {
    const etiquetas: Record<HistorialEstadoDto['entidad'], string> = {
      LOTE: 'Lote',
      SOLICITUD: 'Solicitud',
      ASIGNACION: 'Asignación',
      INCIDENCIA: 'Incidencia',
      ORGANIZACION: 'Organización',
      STRIKE: 'Strike',
    };
    return etiquetas[entidad];
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
