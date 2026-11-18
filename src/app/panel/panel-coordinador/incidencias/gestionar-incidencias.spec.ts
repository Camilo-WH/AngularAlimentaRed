import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  IncidenciaCoordinadorDto,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { GestionarIncidencias } from './gestionar-incidencias';

const incidencia: IncidenciaCoordinadorDto = {
  id: 61,
  loteId: 42,
  loteNombre: 'Frutas frescas',
  detalles: 'Producto recibido en mal estado',
  estadoLoteAnterior: 'DISPONIBLE',
  reportadoPor: 'Coordinación',
  fechaReporte: '2026-11-15T10:00:00',
  resuelta: false,
  resolucion: null,
  resueltoPor: null,
  fechaResolucion: null,
};

const incidenciaResuelta: IncidenciaCoordinadorDto = {
  ...incidencia,
  id: 62,
  resuelta: true,
  resolucion: 'Se revisó el lote y se reactivó.',
  resueltoPor: 'Coordinación',
  fechaResolucion: '2026-11-16T10:00:00',
};

function crearPagina(
  contenido: IncidenciaCoordinadorDto[],
  pagina = 0,
  totalPaginas = 1,
): PaginaCoordinador<IncidenciaCoordinadorDto> {
  return {
    contenido,
    pagina,
    tamano: 20,
    totalElementos: contenido.length,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('GestionarIncidencias', () => {
  const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<GestionarIncidencias>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of(crearPagina([incidencia, incidenciaResuelta])));
    api.post.mockReset();
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [GestionarIncidencias],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionarIncidencias);
  });

  it('crea la pantalla, carga incidencias y muestra las pendientes para resolución', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      'incidencias?page=0&size=20&sort=fechaReporte%2Cdesc',
    );
    expect(fixture.nativeElement.textContent).toContain('Frutas frescas');
    expect(fixture.nativeElement.textContent).toContain('Producto recibido en mal estado');
    expect(fixture.componentInstance.pendientes().map((item) => item.id)).toEqual([incidencia.id]);
  });

  it('muestra el estado vacío cuando no hay incidencias', () => {
    api.get.mockReturnValueOnce(of(crearPagina([])));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay incidencias para el filtro seleccionado.',
    );
  });

  it('muestra el error de carga de la API con sus detalles', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron cargar las incidencias.',
        detalles: ['Error de consulta'],
      },
    });
    api.get.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar las incidencias. Detalles: Error de consulta',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
  });

  it('filtra por incidencias pendientes y envía el parámetro resuelta=false', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    api.get.mockReturnValueOnce(of(crearPagina([incidencia])));
    const filtro: HTMLSelectElement = fixture.nativeElement.querySelector('.filtro select');
    filtro.value = 'PENDIENTES';
    filtro.dispatchEvent(new Event('change'));

    expect(componente.filtro()).toBe('PENDIENTES');
    expect(api.get).toHaveBeenLastCalledWith(
      'incidencias?page=0&size=20&sort=fechaReporte%2Cdesc&resuelta=false',
    );
  });

  it('valida el lote y los detalles al reportar una incidencia', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.reporteForm.controls.loteId.setValue(0);
    componente.reporteForm.controls.detalles.setValue('0123456789');
    componente.solicitarReporte();
    expect(componente.reporteForm.controls.loteId.hasError('min')).toBe(true);

    componente.reporteForm.controls.loteId.setValue(42.5);
    componente.solicitarReporte();
    expect(componente.reporteForm.controls.loteId.hasError('enteroPositivo')).toBe(true);

    componente.reporteForm.controls.loteId.setValue(42);
    componente.reporteForm.controls.detalles.setValue('123456789');
    componente.solicitarReporte();
    expect(componente.reporteForm.controls.detalles.hasError('minlength')).toBe(true);

    componente.reporteForm.controls.detalles.setValue('          ');
    componente.solicitarReporte();
    expect(componente.reporteForm.controls.detalles.hasError('pattern')).toBe(true);

    componente.reporteForm.controls.detalles.setValue('x'.repeat(501));
    componente.solicitarReporte();
    expect(componente.reporteForm.controls.detalles.hasError('maxlength')).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reporta la incidencia con la ruta y el cuerpo correctos, muestra éxito y recarga', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.reporteForm.controls.loteId.setValue(42);
    componente.reporteForm.controls.detalles.setValue('  Producto recibido en mal estado  ');
    componente.solicitarReporte();

    expect(componente.dialogoAbierto()).toBe(true);
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockReturnValueOnce(of(incidencia));
    api.get.mockReturnValueOnce(of(crearPagina([incidencia])));
    componente.confirmarAccion();

    expect(api.post).toHaveBeenCalledWith('incidencias', {
      loteId: 42,
      detalles: 'Producto recibido en mal estado',
    });
    expect(mensajes.exito).toHaveBeenCalledWith(
      'Incidencia #61 registrada para el lote #42.',
    );
    expect(api.get).toHaveBeenLastCalledWith(
      'incidencias?page=0&size=20&sort=fechaReporte%2Cdesc',
    );
  });

  it('consulta las incidencias de un lote por su ruta', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.consultaLoteForm.controls.loteId.setValue(42);
    api.get.mockReturnValueOnce(of([incidencia]));

    componente.buscarPorLote();

    expect(api.get).toHaveBeenLastCalledWith('incidencias/lote/42');
    expect(componente.incidenciasLote()).toEqual([incidencia]);
    expect(componente.loteConsultadoId()).toBe(42);
  });

  it('no consulta por lote si el identificador no es un entero positivo', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.consultaLoteForm.controls.loteId.setValue(0);

    componente.buscarPorLote();

    expect(componente.consultaLoteForm.controls.loteId.hasError('min')).toBe(true);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('valida la resolución y exige elegir si se reactiva o cancela el lote', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.incidenciaSeleccionadaId.set(incidencia.id);
    componente.resolucionForm.controls.resolucion.setValue('abcd');
    componente.resolucionForm.controls.reactivarLote.setValue(null);

    componente.solicitarResolucion();

    expect(componente.resolucionForm.controls.resolucion.hasError('minlength')).toBe(true);
    expect(componente.resolucionForm.controls.reactivarLote.hasError('required')).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('resuelve la incidencia con el cuerpo correcto, éxito y recarga', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.incidenciaSeleccionadaId.set(incidencia.id);
    componente.resolucionForm.controls.resolucion.setValue('Se verificó y reactivó el lote.');
    componente.resolucionForm.controls.reactivarLote.setValue(true);
    componente.solicitarResolucion();

    expect(componente.dialogoAbierto()).toBe(true);
    api.patch.mockReturnValueOnce(of(incidenciaResuelta));
    api.get.mockReturnValueOnce(of(crearPagina([incidenciaResuelta])));

    componente.confirmarAccion();

    expect(api.patch).toHaveBeenCalledWith('incidencias/61/resolver', {
      reactivarLote: true,
      resolucion: 'Se verificó y reactivó el lote.',
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Incidencia #62 resuelta.');
    expect(api.get).toHaveBeenLastCalledWith(
      'incidencias?page=0&size=20&sort=fechaReporte%2Cdesc',
    );
  });

  it('muestra errores del API cuando falla la resolución', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.incidenciaSeleccionadaId.set(incidencia.id);
    componente.resolucionForm.controls.resolucion.setValue('Se revisó el caso reportado.');
    componente.resolucionForm.controls.reactivarLote.setValue(false);
    componente.solicitarResolucion();
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        mensaje: 'La incidencia ya fue resuelta.',
        detalles: ['Actualiza el listado'],
      },
    });
    api.patch.mockReturnValueOnce(throwError(() => error));

    componente.confirmarAccion();

    expect(mensajes.error).toHaveBeenCalledWith(
      'La incidencia ya fue resuelta. Detalles: Actualiza el listado',
    );
    expect(componente.guardando()).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
