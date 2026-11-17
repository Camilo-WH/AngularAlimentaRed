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
import { ConfirmarSalida } from './confirmar-salida';

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

const entrega: EntregaDto = {
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
  cantidadRetirada: 4.5,
  estado: 'PARCIAL',
  fechaEntrega: '2026-11-15T12:00:00',
  observaciones: 'Retiro parcial',
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
    totalElementos: contenido.length,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('ConfirmarSalida', () => {
  const api = { get: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<ConfirmarSalida>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of(crearPagina([asignacion, cerrada])));
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ConfirmarSalida],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarSalida);
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

  it('muestra errores del listado junto con los detalles de la API', () => {
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

  it('valida mínimo, precisión y cantidad pendiente antes de confirmar el retiro', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.accion.setValue('confirmar');

    componente.form.controls.cantidadRetirada.setValue(0);
    componente.solicitarConfirmacion();
    expect(componente.form.controls.cantidadRetirada.hasError('min')).toBe(true);

    componente.form.controls.cantidadRetirada.setValue(1.0001);
    componente.solicitarConfirmacion();
    expect(componente.form.controls.cantidadRetirada.hasError('precisionCantidad')).toBe(true);

    componente.form.controls.cantidadRetirada.setValue(10.001);
    componente.solicitarConfirmacion();
    expect(componente.form.controls.cantidadRetirada.hasError('max')).toBe(true);

    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('exige observaciones no vacías de 5 a 500 caracteres para no recogida', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.accion.setValue('no-recogida');
    componente.form.controls.observaciones.setValue('    ');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('pattern')).toBe(true);

    componente.form.controls.observaciones.setValue('Falta');
    componente.solicitarConfirmacion();
    expect(componente.dialogoAbierto()).toBe(true);

    componente.cerrarDialogo();
    componente.form.controls.observaciones.setValue('x'.repeat(501));
    componente.solicitarConfirmacion();
    expect(componente.form.controls.observaciones.hasError('maxlength')).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
  });

  it('confirma el retiro con el cuerpo correcto, éxito y recarga del listado', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.accion.setValue('confirmar');
    componente.form.controls.cantidadRetirada.setValue(4.5);
    componente.form.controls.observaciones.setValue('  Entrega parcial  ');
    componente.solicitarConfirmacion();

    expect(componente.dialogoAbierto()).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();

    api.patch.mockReturnValueOnce(of(entrega));
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([asignacion])));
    componente.confirmarAccion();

    expect(api.patch).toHaveBeenCalledWith('entregas/12/confirmar', {
      cantidadRetirada: 4.5,
      observaciones: 'Entrega parcial',
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Asignación #12: retiro confirmado.');
    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion%2Cdesc',
    );
  });

  it('registra no recogida con observaciones, muestra éxito y recarga el listado', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.accion.setValue('no-recogida');
    componente.form.controls.observaciones.setValue('  No se presentó  ');
    componente.solicitarConfirmacion();
    api.patch.mockReturnValueOnce(of(asignacion));
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([])));

    componente.confirmarAccion();

    expect(api.patch).toHaveBeenCalledWith('entregas/12/no-recogida', {
      observaciones: 'No se presentó',
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Asignación #12: registrada como no recogida.');
    expect(api.get).toHaveBeenCalledWith(
      'entregas/asignaciones?page=0&size=20&sort=fechaAsignacion%2Cdesc',
    );
  });

  it('muestra el error de API al registrar una salida', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.asignacionSeleccionadaId.set(asignacion.id);
    componente.form.controls.accion.setValue('confirmar');
    componente.form.controls.cantidadRetirada.setValue(1);
    componente.solicitarConfirmacion();
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        mensaje: 'La asignación ya está cerrada.',
        detalles: ['Actualiza el listado'],
      },
    });
    api.patch.mockReturnValueOnce(throwError(() => error));

    componente.confirmarAccion();

    expect(mensajes.error).toHaveBeenCalledWith(
      'La asignación ya está cerrada. Detalles: Actualiza el listado',
    );
    expect(componente.guardando()).toBe(false);
  });
});
