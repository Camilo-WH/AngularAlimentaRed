import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  CategoriaCoordinadorDto,
  EntregaDto,
  HistorialEstadoDto,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { ConsultarHistorial } from './consultar-historial';

const categoria: CategoriaCoordinadorDto = {
  id: 9,
  nombre: 'Frutas',
  descripcion: 'Frutas frescas',
  unidadMedida: 'kg',
};

const entrega: EntregaDto = {
  id: 31,
  asignacionId: 12,
  solicitudId: 17,
  loteId: 23,
  loteNombre: 'Canasta de frutas',
  categoriaNombre: 'Frutas',
  unidadMedida: 'kg',
  donanteId: 4,
  donanteNombre: 'Mercado local',
  receptoraId: 3,
  receptoraNombre: 'Comedor comunitario',
  cantidadRetirada: 5,
  estado: 'PARCIAL',
  fechaEntrega: '2026-11-15T12:00:00',
  observaciones: 'Primera entrega',
  responsable: 'Coordinación',
  fueraDeFranja: false,
};

const evento: HistorialEstadoDto = {
  id: 1,
  entidad: 'SOLICITUD',
  entidadId: entrega.solicitudId,
  estadoAnterior: 'PENDIENTE',
  estadoNuevo: 'APROBADA',
  responsable: 'Coordinación',
  fecha: '2026-11-15T11:00:00',
  justificacion: 'Solicitud aprobada',
};

function crearPagina(
  contenido: EntregaDto[],
  pagina = 0,
  totalPaginas = 1,
): PaginaCoordinador<EntregaDto> {
  return {
    contenido,
    pagina,
    tamano: 20,
    totalElementos: contenido.length === 0 ? 0 : 25,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('ConsultarHistorial', () => {
  const api = { get: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<ConsultarHistorial>;

  beforeEach(async () => {
    api.get.mockReset().mockImplementation((ruta: string) =>
      ruta === 'categorias' ? of([categoria]) : of(crearPagina([entrega])),
    );
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ConsultarHistorial],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultarHistorial);
  });

  it('crea la pantalla y carga categorías e historial paginado', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenNthCalledWith(1, 'categorias');
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      'reportes/historial?page=0&size=20&sort=fechaEntrega%2Cdesc',
    );
    expect(fixture.nativeElement.textContent).toContain('Canasta de frutas');
    expect(fixture.nativeElement.textContent).toContain('Frutas');
  });

  it('muestra el estado vacío cuando el historial no tiene entregas', () => {
    api.get.mockImplementation((ruta: string) =>
      ruta === 'categorias' ? of([categoria]) : of(crearPagina([])),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay entregas para los filtros seleccionados.',
    );
  });

  it('muestra el mensaje y los detalles ante un error del listado', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudo consultar el historial.',
        detalles: ['Error de consulta', 'Intenta más tarde'],
      },
    });
    api.get.mockImplementation((ruta: string) =>
      ruta === 'categorias' ? of([categoria]) : throwError(() => error),
    );

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudo consultar el historial. Detalles: Error de consulta · Intenta más tarde',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('envía filtros opcionales, actualiza el listado y muestra éxito', () => {
    fixture.detectChanges();
    api.get.mockReset().mockImplementation((ruta: string) =>
      ruta === 'categorias' ? of([categoria]) : of(crearPagina([entrega])),
    );
    fixture.componentInstance.filtros.setValue({
      desde: '2026-11-01',
      hasta: '2026-11-15',
      categoriaId: '9',
    });

    fixture.componentInstance.aplicarFiltros();
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledWith(
      'reportes/historial?desde=2026-11-01&hasta=2026-11-15&categoriaId=9&page=0&size=20&sort=fechaEntrega%2Cdesc',
    );
    expect(fixture.componentInstance.entregas()).toEqual([entrega]);
    expect(mensajes.exito).toHaveBeenCalledWith('Historial actualizado.');
  });

  it('solicita la página siguiente con índice desde cero', () => {
    api.get.mockImplementation((ruta: string) =>
      ruta === 'categorias' ? of([categoria]) : of(crearPagina([entrega], 0, 2)),
    );
    fixture.detectChanges();
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([entrega], 1, 2)));

    fixture.componentInstance.irAPagina(1);

    expect(api.get).toHaveBeenCalledWith(
      'reportes/historial?page=1&size=20&sort=fechaEntrega%2Cdesc',
    );
    expect(fixture.componentInstance.pagina()).toBe(1);
  });

  it('no consulta la trazabilidad hasta seleccionar una entrega', () => {
    fixture.detectChanges();
    const llamadasIniciales = api.get.mock.calls.length;

    fixture.componentInstance.consultarHistorialSolicitud();
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledTimes(llamadasIniciales);
    expect(fixture.nativeElement.textContent).toContain(
      'Selecciona una entrega para consultar su historial.',
    );
  });

  it('consulta los historiales de solicitud y lote con los IDs de la entrega', () => {
    fixture.detectChanges();
    api.get.mockReset().mockReturnValue(of([evento]));
    fixture.componentInstance.entregaSeleccionadaId.set(entrega.id);

    fixture.componentInstance.consultarHistorialSolicitud();
    fixture.componentInstance.consultarHistorialLote();
    fixture.detectChanges();

    expect(api.get).toHaveBeenNthCalledWith(1, 'solicitudes/17/historial');
    expect(api.get).toHaveBeenNthCalledWith(2, 'lotes/23/historial');
    expect(mensajes.exito).toHaveBeenNthCalledWith(1, 'Historial de solicitud #17 cargado.');
    expect(mensajes.exito).toHaveBeenNthCalledWith(2, 'Historial de lote #23 cargado.');
    expect(fixture.nativeElement.textContent).toContain('APROBADA');
  });

  it('muestra el error de categorías sin ocultar el listado', () => {
    const error = new HttpErrorResponse({
      status: 503,
      error: { mensaje: 'Categorías temporalmente no disponibles.', detalles: [] },
    });
    api.get.mockImplementation((ruta: string) =>
      ruta === 'categorias' ? throwError(() => error) : of(crearPagina([entrega])),
    );

    fixture.detectChanges();

    expect(fixture.componentInstance.entregas()).toEqual([entrega]);
    expect(fixture.nativeElement.textContent).toContain(
      'Categorías temporalmente no disponibles.',
    );
    expect(fixture.nativeElement.textContent).toContain('Canasta de frutas');
  });
});
