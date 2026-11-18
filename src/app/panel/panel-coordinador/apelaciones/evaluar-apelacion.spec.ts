import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import { StrikeCoordinadorDto } from '../../../core/modelos-coordinador';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { EvaluarApelacion } from './evaluar-apelacion';

const strikeApelado: StrikeCoordinadorDto = {
  id: 71,
  organizacionId: 19,
  organizacionNombre: 'Comedor comunitario',
  asignacionId: 42,
  nombreStrike: 'Asignación no recogida',
  detalles: 'La organización no retiró el lote en la franja acordada.',
  fechaRegistro: '2026-11-15T10:00:00',
  vigente: true,
  justificacionApelacion: 'La organización reportó una emergencia de transporte.',
  fechaApelacion: null,
};

const sinApelacion: StrikeCoordinadorDto = {
  ...strikeApelado,
  id: 72,
  justificacionApelacion: null,
};

const apelacionEvaluada: StrikeCoordinadorDto = {
  ...strikeApelado,
  id: 73,
  fechaApelacion: '2026-11-16T10:00:00',
};

const strikeAnulado: StrikeCoordinadorDto = {
  ...strikeApelado,
  id: 74,
  vigente: false,
};

describe('EvaluarApelacion', () => {
  const api = { get: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<EvaluarApelacion>;

  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(
      of([strikeApelado, sinApelacion, apelacionEvaluada, strikeAnulado]),
    );
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [EvaluarApelacion],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluarApelacion);
  });

  it('crea la pantalla, carga strikes y muestra solo apelaciones pendientes', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('organizaciones/strikes');
    expect(fixture.nativeElement.textContent).toContain('Comedor comunitario');
    expect(fixture.nativeElement.textContent).toContain(
      'La organización reportó una emergencia de transporte.',
    );
    expect(fixture.componentInstance.apelacionesPendientes().map((strike) => strike.id)).toEqual([
      strikeApelado.id,
    ]);
  });

  it('muestra el estado vacío cuando no hay apelaciones pendientes', () => {
    api.get.mockReturnValueOnce(of([sinApelacion, apelacionEvaluada, strikeAnulado]));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay strikes vigentes con apelaciones pendientes.',
    );
    expect(fixture.componentInstance.apelacionesPendientes()).toEqual([]);
  });

  it('muestra errores de carga con los detalles devueltos por la API', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: {
        mensaje: 'No se pudieron cargar los strikes.',
        detalles: ['Error de consulta'],
      },
    });
    api.get.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'No se pudieron cargar los strikes. Detalles: Error de consulta',
    );
    expect(fixture.nativeElement.textContent).toContain('Error de consulta');
  });

  it('valida la decisión y la justificación de 10 a 500 caracteres no vacíos', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.strikeSeleccionadoId.set(strikeApelado.id);
    componente.form.controls.justificacion.setValue('0123456789');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.aprobada.hasError('required')).toBe(true);

    componente.form.controls.aprobada.setValue(true);
    componente.form.controls.justificacion.setValue('corta');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.justificacion.hasError('minlength')).toBe(true);

    componente.form.controls.justificacion.setValue('          ');
    componente.solicitarConfirmacion();
    expect(componente.form.controls.justificacion.hasError('pattern')).toBe(true);

    componente.form.controls.justificacion.setValue('x'.repeat(501));
    componente.solicitarConfirmacion();
    expect(componente.form.controls.justificacion.hasError('maxlength')).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('requiere seleccionar una apelación antes de mostrar la confirmación', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.form.controls.aprobada.setValue(true);
    componente.form.controls.justificacion.setValue('Evaluación con información revisada.');

    componente.solicitarConfirmacion();

    expect(componente.seleccionTocada()).toBe(true);
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('envía aprobación con organización, strike y cuerpo correctos, muestra éxito y recarga', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.strikeSeleccionadoId.set(strikeApelado.id);
    componente.form.controls.aprobada.setValue(true);
    componente.form.controls.justificacion.setValue('  Se verificó la evidencia presentada.  ');
    componente.solicitarConfirmacion();

    expect(componente.dialogoAbierto()).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();

    const evaluado: StrikeCoordinadorDto = {
      ...strikeApelado,
      vigente: false,
      fechaApelacion: '2026-11-16T10:00:00',
    };
    api.patch.mockReturnValueOnce(of(evaluado));
    api.get.mockReturnValueOnce(of([evaluado]));
    componente.evaluarApelacion();

    expect(api.patch).toHaveBeenCalledWith('organizaciones/19/strikes/apelar', {
      strikeId: 71,
      justificacion: 'Se verificó la evidencia presentada.',
      aprobada: true,
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Apelación del strike #71 aprobada.');
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenLastCalledWith('organizaciones/strikes');
    expect(componente.dialogoAbierto()).toBe(false);
  });

  it('envía false al rechazar la apelación y muestra el resultado correspondiente', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.strikeSeleccionadoId.set(strikeApelado.id);
    componente.form.controls.aprobada.setValue(false);
    componente.form.controls.justificacion.setValue('No se aportó evidencia suficiente.');
    componente.solicitarConfirmacion();
    api.patch.mockReturnValueOnce(of(strikeApelado));
    api.get.mockReturnValueOnce(of([]));

    componente.evaluarApelacion();

    expect(api.patch).toHaveBeenCalledWith('organizaciones/19/strikes/apelar', {
      strikeId: 71,
      justificacion: 'No se aportó evidencia suficiente.',
      aprobada: false,
    });
    expect(mensajes.exito).toHaveBeenCalledWith('Apelación del strike #71 rechazada.');
  });

  it('muestra el error de API cuando falla la evaluación', () => {
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.strikeSeleccionadoId.set(strikeApelado.id);
    componente.form.controls.aprobada.setValue(true);
    componente.form.controls.justificacion.setValue('Se revisó la documentación recibida.');
    componente.solicitarConfirmacion();
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        mensaje: 'El strike ya fue evaluado.',
        detalles: ['Actualiza el listado'],
      },
    });
    api.patch.mockReturnValueOnce(throwError(() => error));

    componente.evaluarApelacion();

    expect(mensajes.error).toHaveBeenCalledWith(
      'El strike ya fue evaluado. Detalles: Actualiza el listado',
    );
    expect(componente.guardando()).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
