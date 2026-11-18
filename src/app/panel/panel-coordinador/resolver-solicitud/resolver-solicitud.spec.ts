import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  PaginaCoordinador,
  SolicitudDto,
} from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { ResolverSolicitud } from './resolver-solicitud';

const solicitud: SolicitudDto = {
  id: 8,
  loteId: 31,
  loteNombre: 'Canasta de frutas',
  unidadMedida: 'kg',
  organizacionId: 17,
  organizacionNombre: 'Comedor comunitario',
  cantidadSolicitada: 12,
  estado: 'PENDIENTE',
  enEmpate: false,
  fechaCreacion: '2026-11-15T10:00:00',
  fechaLimiteConfirmacion: '2026-11-16T10:00:00',
  fechaResolucion: null,
  motivoResolucion: null,
};

function crearPagina(
  contenido: SolicitudDto[],
  pagina = 0,
  totalPaginas = 1,
): PaginaCoordinador<SolicitudDto> {
  return {
    contenido,
    pagina,
    tamano: 20,
    totalElementos: contenido.length === 0 ? 0 : 25,
    totalPaginas,
    ultima: pagina >= totalPaginas - 1,
  };
}

describe('ResolverSolicitud', () => {
  const api = { get: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<ResolverSolicitud>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of(crearPagina([solicitud])));
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [ResolverSolicitud],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResolverSolicitud);
  });

  it('crea la pantalla y carga solicitudes pendientes por defecto', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(
      'solicitudes?estado=PENDIENTE&page=0&size=20&sort=fechaCreacion%2Cdesc',
    );
    expect(fixture.nativeElement.textContent).toContain('Canasta de frutas');
    expect(fixture.nativeElement.textContent).toContain('Comedor comunitario');
  });

  it('muestra el estado vacío cuando no hay solicitudes', () => {
    api.get.mockReturnValueOnce(of(crearPagina([])));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay solicitudes para el estado seleccionado.',
    );
  });

  it('muestra el error de API y sus detalles', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron cargar las solicitudes.',
        detalles: ['Error de consulta', 'Intenta más tarde'],
      },
    });
    api.get.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar las solicitudes. Detalles: Error de consulta · Intenta más tarde',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('exige motivo no vacío al rechazar y no envía la solicitud antes de confirmar', () => {
    fixture.detectChanges();
    fixture.componentInstance.solicitudSeleccionadaId.set(solicitud.id);
    fixture.componentInstance.form.setValue({ decision: 'rechazar', motivo: '   ' });

    fixture.componentInstance.solicitarConfirmacion();
    fixture.detectChanges();

    expect(fixture.componentInstance.motivoObligatorio()).toBe(true);
    expect(fixture.componentInstance.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('El motivo es obligatorio al rechazar.');
  });

  it('limita el motivo a 500 caracteres', () => {
    fixture.detectChanges();
    fixture.componentInstance.solicitudSeleccionadaId.set(solicitud.id);
    fixture.componentInstance.form.setValue({
      decision: 'rechazar',
      motivo: 'x'.repeat(501),
    });

    fixture.componentInstance.solicitarConfirmacion();

    expect(fixture.componentInstance.form.controls.motivo.hasError('maxlength')).toBe(true);
    expect(fixture.componentInstance.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('pide confirmación, envía el PATCH de aprobación y recarga el listado al tener éxito', () => {
    fixture.detectChanges();
    fixture.componentInstance.solicitudSeleccionadaId.set(solicitud.id);
    fixture.componentInstance.form.setValue({ decision: 'aprobar', motivo: '' });
    fixture.componentInstance.solicitarConfirmacion();

    expect(fixture.componentInstance.dialogoAbierto()).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();

    api.patch.mockReturnValueOnce(of({ ...solicitud, estado: 'APROBADO' }));
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([])));
    fixture.componentInstance.confirmarResolucion();

    expect(api.patch).toHaveBeenCalledWith('solicitudes/8/resolver', {
      aprobada: true,
      motivo: null,
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Solicitud #8 aprobada.');
    expect(api.get).toHaveBeenCalledWith(
      'solicitudes?estado=PENDIENTE&page=0&size=20&sort=fechaCreacion%2Cdesc',
    );
  });

  it('recorta y envía el motivo al rechazar la solicitud', () => {
    fixture.detectChanges();
    fixture.componentInstance.solicitudSeleccionadaId.set(solicitud.id);
    fixture.componentInstance.form.setValue({
      decision: 'rechazar',
      motivo: '  Documentación incompleta  ',
    });
    fixture.componentInstance.solicitarConfirmacion();
    api.patch.mockReturnValueOnce(of({ ...solicitud, estado: 'RECHAZADA' }));
    api.get.mockReset().mockReturnValueOnce(of(crearPagina([])));

    fixture.componentInstance.confirmarResolucion();

    expect(api.patch).toHaveBeenCalledWith('solicitudes/8/resolver', {
      aprobada: false,
      motivo: 'Documentación incompleta',
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Solicitud #8 rechazada.');
  });

  it('muestra errores del PATCH y conserva la solicitud para reintentar', () => {
    fixture.detectChanges();
    fixture.componentInstance.solicitudSeleccionadaId.set(solicitud.id);
    fixture.componentInstance.form.setValue({ decision: 'aprobar', motivo: '' });
    fixture.componentInstance.solicitarConfirmacion();
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        mensaje: 'La solicitud ya fue resuelta.',
        detalles: ['Actualiza el listado'],
      },
    });
    api.patch.mockReturnValueOnce(throwError(() => error));

    fixture.componentInstance.confirmarResolucion();

    expect(mensajes.error).toHaveBeenCalledWith(
      'La solicitud ya fue resuelta. Detalles: Actualiza el listado',
    );
    expect(fixture.componentInstance.solicitudSeleccionada()?.id).toBe(solicitud.id);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
