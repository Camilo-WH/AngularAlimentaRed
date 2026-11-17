import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  AsignacionDto,
  EntregaDto,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { ConsultarAsignacionesEntregas } from './consultar-asignaciones-entregas';

const asignacion: AsignacionDto = {
  id: 21,
  solicitudId: 7,
  loteId: 12,
  loteNombre: 'Canasta de frutas',
  unidadMedida: 'kg',
  organizacionId: 3,
  organizacionNombre: 'Comedor comunitario',
  donanteId: 4,
  donanteNombre: 'Mercado local',
  cantidadAsignada: 15,
  cantidadRetirada: 5,
  cantidadPendiente: 10,
  estado: 'RETIRO_PARCIAL',
  autoAsignada: false,
  fechaAsignacion: '2026-11-15T10:00:00',
  fechaLimiteRetiro: '2026-11-17T10:00:00',
  fechaCierre: null,
  ubicacion: 'Calle 10',
  instruccionesRecogida: 'Presentarse en portería',
  contacto: '3000000000',
};

const retiro: EntregaDto = {
  id: 42,
  asignacionId: asignacion.id,
  solicitudId: asignacion.solicitudId,
  loteId: asignacion.loteId,
  loteNombre: asignacion.loteNombre,
  categoriaNombre: 'Frutas',
  unidadMedida: 'kg',
  donanteId: asignacion.donanteId,
  donanteNombre: asignacion.donanteNombre,
  receptoraId: asignacion.organizacionId,
  receptoraNombre: asignacion.organizacionNombre,
  cantidadRetirada: 5,
  estado: 'PARCIAL',
  fechaEntrega: '2026-11-15T12:00:00',
  observaciones: 'Primera entrega',
  responsable: 'Coordinación',
  fueraDeFranja: false,
};

function crearPagina(
  contenido: AsignacionDto[],
  pagina = 0,
  totalPaginas = 1,
): PaginaCoordinador<AsignacionDto> {
  return {
    contenido,
    pagina,
    tamano: 20,
    totalElementos: contenido.length === 0 ? 0 : 25,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('ConsultarAsignacionesEntregas', () => {
  const api = { get: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<ConsultarAsignacionesEntregas>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of(crearPagina([asignacion])));
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ConsultarAsignacionesEntregas],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultarAsignacionesEntregas);
  });

  it('crea la pantalla y carga la primera página del listado', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion,desc',
    );
    expect(fixture.nativeElement.textContent).toContain('Canasta de frutas');
    expect(fixture.nativeElement.textContent).toContain('Comedor comunitario');
  });

  it('muestra el estado vacío cuando no hay asignaciones', () => {
    api.get.mockReturnValueOnce(of(crearPagina([])));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay asignaciones para mostrar.');
  });

  it('muestra el mensaje y los detalles cuando falla la carga', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron consultar las asignaciones.',
        detalles: ['Servicio no disponible', 'Intenta más tarde'],
      },
    });
    api.get.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron consultar las asignaciones. Detalles: Servicio no disponible · Intenta más tarde',
    );
    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('solicita la página siguiente con el índice basado en cero', () => {
    api.get.mockReturnValueOnce(of(crearPagina([asignacion], 0, 2)));
    fixture.detectChanges();

    api.get
      .mockReset()
      .mockReturnValueOnce(of(crearPagina([asignacion], 1, 2)));
    fixture.componentInstance.irAPagina(1);

    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=1&size=20&sort=fechaAsignacion,desc',
    );
    expect(fixture.componentInstance.pagina()).toBe(1);
  });

  it('consulta detalle y retiros, muestra éxito y recarga el listado', () => {
    fixture.detectChanges();
    api.get
      .mockReset()
      .mockReturnValueOnce(of(asignacion))
      .mockReturnValueOnce(of([retiro]))
      .mockReturnValueOnce(of(crearPagina([asignacion])));
    fixture.componentInstance.asignacionSeleccionadaId.set(asignacion.id);

    fixture.componentInstance.consultarDetalle();
    fixture.detectChanges();

    expect(api.get).toHaveBeenNthCalledWith(1, 'entregas/asignaciones/21');
    expect(api.get).toHaveBeenNthCalledWith(2, 'entregas/asignaciones/21/retiros');
    expect(api.get).toHaveBeenNthCalledWith(
      3,
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion,desc',
    );
    expect(fixture.componentInstance.detalle()).toEqual(asignacion);
    expect(fixture.componentInstance.retiros()).toEqual([retiro]);
    expect(mensajes.exito).toHaveBeenCalledWith('Detalle de la asignación #21 cargado.');
    expect(fixture.nativeElement.textContent).toContain('Primera entrega');
  });

  it('muestra mensaje y estado de error cuando falla la consulta del detalle', () => {
    fixture.detectChanges();
    const error = new HttpErrorResponse({
      status: 404,
      error: { mensaje: 'La asignación no existe.', detalles: [] },
    });
    api.get.mockReset().mockReturnValueOnce(throwError(() => error));
    fixture.componentInstance.asignacionSeleccionadaId.set(asignacion.id);

    fixture.componentInstance.consultarDetalle();
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledWith('entregas/asignaciones/21');
    expect(mensajes.error).toHaveBeenCalledWith('La asignación no existe.');
    expect(fixture.nativeElement.textContent).toContain('La asignación no existe.');
  });
});
