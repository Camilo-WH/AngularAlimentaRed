import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  AsignacionDto,
  PaginaCoordinador,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { LiberarSobrante } from './liberar-sobrante';

const asignacion: AsignacionDto = {
  id: 12,
  solicitudId: 7,
  loteId: 31,
  loteNombre: 'Canasta de frutas',
  unidadMedida: 'kg',
  organizacionId: 17,
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

const cerrada: AsignacionDto = { ...asignacion, id: 13, estado: 'COMPLETADA' };

function crearPagina(
  contenido: AsignacionDto[],
  pagina = 0,
  totalPaginas = 1,
): PaginaCoordinador<AsignacionDto> {
  return {
    contenido,
    pagina,
    tamano: 20,
    totalElementos: contenido.length,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('LiberarSobrante', () => {
  const api = { get: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<LiberarSobrante>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of(crearPagina([asignacion, cerrada])));
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [LiberarSobrante],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LiberarSobrante);
  });

  it('crea la pantalla, carga asignaciones y muestra solo las abiertas', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion%2Cdesc',
    );
    expect(fixture.nativeElement.textContent).toContain('Canasta de frutas');
    expect(fixture.nativeElement.textContent).toContain('10 kg');
    expect(fixture.componentInstance.abiertas().map((item) => item.id)).toEqual([asignacion.id]);
  });

  it('muestra el estado vacío cuando no hay asignaciones', () => {
    api.get.mockReturnValueOnce(of(crearPagina([])));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay asignaciones registradas.');
  });

  it('indica cuando la página solo contiene asignaciones cerradas', () => {
    api.get.mockReturnValueOnce(of(crearPagina([cerrada])));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay asignaciones abiertas en esta página.',
    );
    expect(fixture.componentInstance.abiertas()).toEqual([]);
  });

  it('muestra el error de carga junto con los detalles de la API', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron cargar las asignaciones.',
        detalles: ['Error de consulta', 'Intenta más tarde'],
      },
    });
    api.get.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar las asignaciones. Detalles: Error de consulta · Intenta más tarde',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
  });

  it('valida que las observaciones tengan entre 5 y 500 caracteres y no sean espacios', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);

    componente.form.controls.observaciones.setValue('');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('required')).toBe(true);

    componente.form.controls.observaciones.setValue('    ');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('pattern')).toBe(true);

    componente.form.controls.observaciones.setValue('abcd');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('minlength')).toBe(true);

    componente.form.controls.observaciones.setValue('x'.repeat(501));
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('maxlength')).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('exige seleccionar una asignación antes de abrir la confirmación', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.form.controls.observaciones.setValue('Sobrante disponible');

    componente.solicitarConfirmacion();

    expect(componente.seleccionTocada()).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('confirma el restock con método, ruta y cuerpo correctos, muestra éxito y recarga', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.observaciones.setValue('  Sobrante sin retirar  ');
    componente.solicitarConfirmacion();

    expect(componente.dialogoAbierto()).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();

    api.patch.mockReturnValueOnce(of({ ...asignacion, estado: 'CERRADA_CON_RESTOCK' }));
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([])));
    componente.liberarSobrante();

    expect(api.patch).toHaveBeenCalledWith('entregas/12/restock', {
      observaciones: 'Sobrante sin retirar',
    });
    expect(mensajes.exito).toHaveBeenCalledWith(
      'Asignación #12: sobrante devuelto al catálogo.',
    );
    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion%2Cdesc',
    );
    expect(componente.dialogoAbierto()).toBe(false);
  });

  it('muestra los detalles de error de la API cuando falla el restock', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.observaciones.setValue('Sobrante sin retirar');
    componente.solicitarConfirmacion();
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        mensaje: 'La asignación ya está cerrada.',
        detalles: ['Actualiza el listado'],
      },
    });
    api.patch.mockReturnValueOnce(throwError(() => error));

    componente.liberarSobrante();

    expect(mensajes.error).toHaveBeenCalledWith(
      'La asignación ya está cerrada. Detalles: Actualiza el listado',
    );
    expect(componente.guardando()).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('cambia de página y carga las siguientes asignaciones', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.paginaActual.set(crearPagina([asignacion], 0, 2));
    api.get.mockReturnValueOnce(of(crearPagina([], 1, 2)));

    componente.irAPagina(1);

    expect(componente.pagina()).toBe(1);
    expect(api.get).toHaveBeenLastCalledWith(
      'entregas/asignaciones?page=1&size=20&sort=fechaAsignacion%2Cdesc',
    );
  });
});
