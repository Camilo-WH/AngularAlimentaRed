import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  CategoriaCoordinadorDto,
  ErrorApiCoordinador,
  EstadoSolicitud,
  ImpactoCategoriaCoordinadorDto,
  OrganizacionStrikesCoordinadorDto,
  ReporteImpactoCoordinadorDto,
} from '../../../core/modelos-coordinador';
import { ColumnaTabla } from '../../../core/modelos';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { TablaComponent } from '../../../shared/tabla/tabla.component';

interface FilaSolicitudPorEstado {
  estado: string;
  cantidad: string;
}

interface FilaImpactoCategoria {
  categoria: string;
  lotes: string;
  cantidadPublicada: string;
  cantidadRecuperada: string;
  unidadMedida: string;
}

interface FilaOrganizacionConStrikes {
  organizacion: string;
  strikesVigentes: string;
  estadoCuenta: string;
}

const ESTADOS_SOLICITUD: readonly EstadoSolicitud[] = [
  'APROBADO',
  'CANCELADO',
  'PENDIENTE',
  'RECHAZADA',
  'EXPIRADA',
  'COMPLETADA',
];

const ETIQUETAS_ESTADO: Record<EstadoSolicitud, string> = {
  APROBADO: 'Aprobadas',
  CANCELADO: 'Canceladas',
  PENDIENTE: 'Pendientes',
  RECHAZADA: 'Rechazadas',
  EXPIRADA: 'Expiradas',
  COMPLETADA: 'Completadas',
};

const VALIDAR_RANGO_FECHAS: ValidatorFn = (control): ValidationErrors | null => {
  const desde: unknown = control.get('desde')?.value;
  const hasta: unknown = control.get('hasta')?.value;
  if (typeof desde !== 'string' || typeof hasta !== 'string' || !desde || !hasta) {
    return null;
  }
  return desde <= hasta ? null : { rangoFechas: true };
};

@Component({
  selector: 'app-consultar-indicadores',
  standalone: true,
  imports: [IndicadorCargaComponent, ReactiveFormsModule, TablaComponent],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <div>
          <h2>Consultar indicadores</h2>
          <p class="resumen">
            Impacto de lotes, entregas, solicitudes y organizaciones durante un período.
          </p>
        </div>
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
            <option value="">Todas las categorías</option>
            @for (categoria of categorias(); track categoria.id) {
              <option [value]="categoria.id">{{ categoria.nombre }}</option>
            }
          </select>
        </label>
        <div class="acciones-filtro">
          <button type="submit" [disabled]="cargandoReporte()">
            {{ cargandoReporte() ? 'Actualizando...' : 'Aplicar filtros' }}
          </button>
          <button
            type="button"
            class="secundario"
            [disabled]="cargandoReporte()"
            (click)="limpiarFiltros()"
          >
            Limpiar
          </button>
        </div>
        @if (filtros.hasError('rangoFechas')) {
          <small class="error-carga" role="alert">
            La fecha inicial no puede ser posterior a la fecha final.
          </small>
        }
        @if (errorCategorias()) {
          <div class="error-categorias" role="alert">
            <span>{{ errorCategorias() }}</span>
            <button type="button" class="secundario" (click)="cargarCategorias()">Reintentar</button>
          </div>
        }
      </form>

      @if (cargandoReporte()) {
        <p class="estado" role="status">Cargando indicadores...</p>
      } @else if (errorReporte()) {
        <div class="estado error-carga" role="alert">
          <p>{{ errorReporte() }}</p>
          <button type="button" class="secundario" (click)="cargarReporte()">Reintentar</button>
        </div>
      } @else if (reporte(); as datos) {
        <p class="periodo">
          Período del {{ datos.desde }} al {{ datos.hasta }}
          @if (datos.categoriaId !== null) {
            · Categoría #{{ datos.categoriaId }}
          }
        </p>

        <section class="tarjetas" aria-label="Totales de impacto">
          <article class="tarjeta">
            <span>Lotes publicados</span>
            <strong>{{ formatearNumero(datos.totalLotesPublicados) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Cantidad publicada</span>
            <strong>{{ formatearNumero(datos.cantidadTotalPublicada) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Cantidad asignada</span>
            <strong>{{ formatearNumero(datos.cantidadTotalAsignada) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Cantidad recuperada</span>
            <strong>{{ formatearNumero(datos.cantidadTotalRecuperada) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Recuperación</span>
            <strong>{{ formatearNumero(datos.porcentajeRecuperacion) }} %</strong>
          </article>
          <article class="tarjeta">
            <span>Entregas</span>
            <strong>{{ formatearNumero(datos.totalEntregas) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Entregas fuera de franja</span>
            <strong>{{ formatearNumero(datos.entregasFueraDeFranja) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Tiempo promedio de respuesta</span>
            <strong>
              @if (datos.tiempoPromedioRespuestaMinutos === null) {
                Sin datos
              } @else {
                {{ formatearNumero(datos.tiempoPromedioRespuestaMinutos) }} min
              }
            </strong>
          </article>
          <article class="tarjeta">
            <span>Strikes registrados</span>
            <strong>{{ formatearNumero(datos.strikesRegistrados) }}</strong>
          </article>
          <article class="tarjeta">
            <span>Organizaciones bloqueadas</span>
            <strong>{{ formatearNumero(datos.organizacionesBloqueadas) }}</strong>
          </article>
        </section>

        <section class="tabla-seccion" aria-labelledby="titulo-solicitudes">
          <h3 id="titulo-solicitudes">Solicitudes por estado</h3>
          <app-tabla
            [filas]="filasSolicitudes()"
            [columnas]="columnasSolicitudes"
            [tamanoPagina]="10"
            textoVacio="No hay datos de solicitudes para este período."
          />
        </section>

        <section class="tabla-seccion" aria-labelledby="titulo-categorias">
          <h3 id="titulo-categorias">Impacto por categoría</h3>
          <app-tabla
            [filas]="filasCategorias()"
            [columnas]="columnasCategorias"
            [tamanoPagina]="10"
            textoVacio="No hay datos por categoría para este período."
          />
        </section>

        <section class="tabla-seccion" aria-labelledby="titulo-organizaciones">
          <h3 id="titulo-organizaciones">Organizaciones con strikes vigentes</h3>
          <app-tabla
            [filas]="filasOrganizaciones()"
            [columnas]="columnasOrganizaciones"
            [tamanoPagina]="10"
            textoVacio="No hay organizaciones con strikes vigentes."
          />
        </section>
      }

      <app-indicador-carga
        [visible]="cargandoReporte() || cargandoCategorias()"
        [texto]="cargandoReporte() ? 'Cargando indicadores...' : 'Cargando categorías...'"
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
      .estado,
      .periodo {
        color: var(--color-texto-secundario);
      }
      .resumen {
        margin: 5px 0 0;
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
      .filtros label {
        display: grid;
        min-width: 180px;
        gap: 6px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      input,
      select {
        min-height: 42px;
        padding: 9px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
      }
      .acciones-filtro {
        display: flex;
        gap: 8px;
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
      .error-carga {
        color: var(--color-error);
      }
      .error-categorias {
        display: flex;
        flex-basis: 100%;
        align-items: center;
        gap: 12px;
        color: var(--color-error);
      }
      .estado {
        padding: 14px 0;
      }
      .periodo {
        margin: 0 0 14px;
        font-size: 14px;
      }
      .tarjetas {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .tarjeta {
        display: grid;
        min-height: 90px;
        align-content: space-between;
        gap: 12px;
        padding: 18px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }
      .tarjeta span {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
      }
      .tarjeta strong {
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
        font-size: var(--texto-2xl);
        font-weight: var(--peso-bold);
      }
      .tabla-seccion {
        margin-top: 24px;
      }
      .tabla-seccion h3 {
        margin-bottom: 10px;
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
        .acciones-filtro {
          flex-wrap: wrap;
        }
        .error-categorias {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ConsultarIndicadores implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly filtros = this.fb.nonNullable.group(
    {
      desde: '',
      hasta: '',
      categoriaId: '',
    },
    { validators: VALIDAR_RANGO_FECHAS },
  );

  readonly reporte = signal<ReporteImpactoCoordinadorDto | null>(null);
  readonly categorias = signal<CategoriaCoordinadorDto[]>([]);
  readonly cargandoReporte = signal(false);
  readonly cargandoCategorias = signal(false);
  readonly errorReporte = signal<string | null>(null);
  readonly errorCategorias = signal<string | null>(null);

  readonly filasSolicitudes = computed<FilaSolicitudPorEstado[]>(() => {
    const reporte = this.reporte();
    return reporte
      ? ESTADOS_SOLICITUD.map((estado) => ({
          estado: ETIQUETAS_ESTADO[estado],
          cantidad: this.formatearNumero(reporte.solicitudesPorEstado[estado]),
        }))
      : [];
  });

  readonly filasCategorias = computed<FilaImpactoCategoria[]>(() =>
    (this.reporte()?.porCategoria ?? []).map((categoria: ImpactoCategoriaCoordinadorDto) => ({
      categoria: categoria.categoria,
      lotes: this.formatearNumero(categoria.lotes),
      cantidadPublicada: this.formatearNumero(categoria.cantidadPublicada),
      cantidadRecuperada: this.formatearNumero(categoria.cantidadRecuperada),
      unidadMedida: categoria.unidadMedida,
    })),
  );

  readonly filasOrganizaciones = computed<FilaOrganizacionConStrikes[]>(() =>
    (this.reporte()?.organizacionesConStrikes ?? []).map(
      (organizacion: OrganizacionStrikesCoordinadorDto) => ({
        organizacion: `${organizacion.nombre} (#${organizacion.organizacionId})`,
        strikesVigentes: this.formatearNumero(organizacion.strikesVigentes),
        estadoCuenta: organizacion.bloqueada ? 'Bloqueada' : 'Activa',
      }),
    ),
  );

  readonly columnasSolicitudes: ColumnaTabla<FilaSolicitudPorEstado>[] = [
    { titulo: 'Estado', clave: 'estado' },
    { titulo: 'Cantidad', clave: 'cantidad' },
  ];

  readonly columnasCategorias: ColumnaTabla<FilaImpactoCategoria>[] = [
    { titulo: 'Categoría', clave: 'categoria' },
    { titulo: 'Lotes publicados', clave: 'lotes' },
    { titulo: 'Cantidad publicada', clave: 'cantidadPublicada' },
    { titulo: 'Cantidad recuperada', clave: 'cantidadRecuperada' },
    { titulo: 'Unidad', clave: 'unidadMedida' },
  ];

  readonly columnasOrganizaciones: ColumnaTabla<FilaOrganizacionConStrikes>[] = [
    { titulo: 'Organización', clave: 'organizacion' },
    { titulo: 'Strikes vigentes', clave: 'strikesVigentes' },
    { titulo: 'Estado de cuenta', clave: 'estadoCuenta' },
  ];

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarReporte();
  }

  aplicarFiltros(): void {
    this.filtros.markAllAsTouched();
    if (this.filtros.invalid) {
      return;
    }
    this.cargarReporte();
  }

  limpiarFiltros(): void {
    this.filtros.reset({ desde: '', hasta: '', categoriaId: '' });
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.cargandoReporte.set(true);
    this.errorReporte.set(null);
    this.api.get<ReporteImpactoCoordinadorDto>(this.rutaReporte()).subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargandoReporte.set(false);
      },
      error: (error: unknown) => {
        this.reporte.set(null);
        this.cargandoReporte.set(false);
        const mensaje = this.mensajeError(error, 'No se pudieron cargar los indicadores.');
        this.errorReporte.set(mensaje);
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

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(valor);
  }

  private rutaReporte(): string {
    const parametros = new URLSearchParams();
    const { desde, hasta, categoriaId } = this.filtros.getRawValue();
    if (desde) {
      parametros.set('desde', desde);
    }
    if (hasta) {
      parametros.set('hasta', hasta);
    }
    if (categoriaId) {
      parametros.set('categoriaId', categoriaId);
    }
    const consulta = parametros.toString();
    return consulta ? `reportes/impacto?${consulta}` : 'reportes/impacto';
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
