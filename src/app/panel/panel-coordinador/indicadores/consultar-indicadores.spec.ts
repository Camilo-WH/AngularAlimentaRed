import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  CategoriaCoordinadorDto,
  ReporteImpactoCoordinadorDto,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { ConsultarIndicadores } from './consultar-indicadores';

const categoria: CategoriaCoordinadorDto = {
  id: 8,
  nombre: 'Frutas',
  descripcion: 'Frutas frescas',
  unidadMedida: 'kg',
};

const reporte: ReporteImpactoCoordinadorDto = {
  desde: '2026-10-17',
  hasta: '2026-11-16',
  categoriaId: null,
  totalLotesPublicados: 12,
  cantidadTotalPublicada: 185.5,
  cantidadTotalAsignada: 140,
  cantidadTotalRecuperada: 96.25,
  porcentajeRecuperacion: 51.89,
  totalEntregas: 18,
  entregasFueraDeFranja: 2,
  solicitudesPorEstado: {
    APROBADO: 5,
    CANCELADO: 1,
    PENDIENTE: 3,
    RECHAZADA: 2,
    EXPIRADA: 1,
    COMPLETADA: 6,
  },
  tiempoPromedioRespuestaMinutos: 32.5,
  strikesRegistrados: 4,
  organizacionesBloqueadas: 1,
  porCategoria: [
    {
      categoriaId: categoria.id,
      categoria: categoria.nombre,
      unidadMedida: categoria.unidadMedida,
      lotes: 7,
      cantidadPublicada: 100.5,
      cantidadRecuperada: 80.25,
    },
  ],
  organizacionesConStrikes: [
    {
      organizacionId: 19,
      nombre: 'Comedor comunitario',
      strikesVigentes: 2,
      bloqueada: true,
    },
  ],
};

describe('ConsultarIndicadores', () => {
  const api = { get: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<ConsultarIndicadores>;

  beforeEach(async () => {
    api.get.mockReset()
      .mockReturnValueOnce(of([categoria]))
      .mockReturnValueOnce(of(reporte));
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ConsultarIndicadores],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultarIndicadores);
  });

  it('crea la pantalla, carga categorías e indicadores y muestra tarjetas y tablas', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenNthCalledWith(1, 'categorias');
    expect(api.get).toHaveBeenNthCalledWith(2, 'reportes/impacto');
    expect(fixture.nativeElement.textContent).toContain('185,5');
    expect(fixture.nativeElement.textContent).toContain('51,89 %');
    expect(fixture.nativeElement.textContent).toContain('Solicitudes por estado');
    expect(fixture.nativeElement.textContent).toContain('Frutas');
    expect(fixture.nativeElement.textContent).toContain('Comedor comunitario');
  });

  it('muestra las tablas vacías cuando las listas del reporte están vacías', () => {
    const reporteSinFilas: ReporteImpactoCoordinadorDto = {
      ...reporte,
      porCategoria: [],
      organizacionesConStrikes: [],
    };
    api.get.mockReset()
      .mockReturnValueOnce(of([categoria]))
      .mockReturnValueOnce(of(reporteSinFilas));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay datos por categoría para este período.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'No hay organizaciones con strikes vigentes.',
    );
  });

  it('muestra los detalles de error del endpoint de impacto', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron cargar los indicadores.',
        detalles: ['Error de consulta'],
      },
    });
    api.get.mockReset()
      .mockReturnValueOnce(of([categoria]))
      .mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar los indicadores. Detalles: Error de consulta',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
  });

  it('aplica fechas y categoría en los parámetros del reporte', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.filtros.setValue({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      categoriaId: '8',
    });
    api.get.mockReturnValueOnce(of(reporte));

    componente.aplicarFiltros();

    expect(api.get).toHaveBeenLastCalledWith(
      'reportes/impacto?desde=2026-10-01&hasta=2026-10-31&categoriaId=8',
    );
  });

  it('rechaza un rango de fechas donde desde es posterior a hasta', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.filtros.setValue({
      desde: '2026-11-02',
      hasta: '2026-11-01',
      categoriaId: '',
    });

    componente.aplicarFiltros();
    fixture.detectChanges();

    expect(componente.filtros.hasError('rangoFechas')).toBe(true);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
  });

  it('limpia filtros y vuelve a consultar sin parámetros', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.filtros.setValue({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      categoriaId: '8',
    });
    api.get.mockReturnValueOnce(of(reporte));

    componente.limpiarFiltros();

    expect(componente.filtros.getRawValue()).toEqual({
      desde: '',
      hasta: '',
      categoriaId: '',
    });
    expect(api.get).toHaveBeenLastCalledWith('reportes/impacto');
  });

  it('muestra error de categorías sin perder los indicadores', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: {
        mensaje: 'No se pudieron cargar las categorías.',
        detalles: ['Servicio no disponible'],
      },
    });
    api.get.mockReset()
      .mockReturnValueOnce(throwError(() => error))
      .mockReturnValueOnce(of(reporte));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar las categorías. Detalles: Servicio no disponible',
    );
    expect(fixture.componentInstance.reporte()).toEqual(reporte);
    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible');
  });

  it('muestra una respuesta promedio vacía cuando el backend no la calcula', () => {
    api.get.mockReset()
      .mockReturnValueOnce(of([categoria]))
      .mockReturnValueOnce(of({ ...reporte, tiempoPromedioRespuestaMinutos: null }));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin datos');
  });
});
