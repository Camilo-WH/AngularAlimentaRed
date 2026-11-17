import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../../../core/api.service';
import {
  RegistrarOrganizacionRequest,
  RegistrarOrganizacionResponse,
} from '../../../core/modelos-admin-gestion';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';
import { RegistrarOrganizacion } from './registrar-organizacion';

const respuesta: RegistrarOrganizacionResponse = {
  token: 'token-del-registro',
  tipo: 'Bearer',
  expiraEnSegundos: 3600,
  usuario: {
    id: 22,
    nombre: 'Ana Responsable',
    correo: 'ana@example.com',
    rol: 'RECEPTORA',
    activo: true,
    fechaRegistro: '2026-11-17T10:00:00',
    organizacion: {
      id: 31,
      nit: '900123456-7',
      nombre: 'Comedor Comunitario',
      ubicacion: 'Bogotá',
      correo: 'contacto@example.com',
      telefono: '+57 1234567',
      verificada: false,
      bloqueada: false,
      strikesVigentes: 0,
      fechaRegistro: '2026-11-17T10:00:00',
    },
  },
};

function completarFormulario(componente: RegistrarOrganizacion): void {
  componente.form.setValue({
    nombre: '  Ana Responsable  ',
    correo: 'ana@example.com',
    contrasena: 'Secreto123',
    repetirContrasena: 'Secreto123',
    rol: 'RECEPTORA',
    verificarAhora: false,
    organizacion: {
      nit: '900123456-7',
      nombre: ' Comedor Comunitario ',
      ubicacion: ' Bogotá ',
      correo: 'contacto@example.com',
      telefono: ' +57 1234567 ',
    },
  });
}

describe('RegistrarOrganizacion', () => {
  const api = { post: vi.fn(), patch: vi.fn() };
  const mensajes = { exito: vi.fn(), error: vi.fn() };
  let fixture: ComponentFixture<RegistrarOrganizacion>;

  beforeEach(async () => {
    api.post.mockReset();
    api.patch.mockReset();
    mensajes.exito.mockReset();
    mensajes.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [RegistrarOrganizacion],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: MensajesService, useValue: mensajes },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarOrganizacion);
  });

  afterEach(() => {
    sessionStorage.removeItem('alimentared_sesion');
  });

  it('crea y muestra el formulario vacío sin hacer peticiones al cargar', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Registrar organización');
    expect(fixture.nativeElement.textContent).toContain('Completa los datos para registrar');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('valida campos requeridos, formato, límites, contraseña y NIT', () => {
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    completarFormulario(componente);
    componente.form.patchValue({
      correo: 'correo-inválido',
      contrasena: 'cortita',
      repetirContrasena: 'otra',
      organizacion: {
        nit: '12-ABC',
        nombre: 'Comedor',
        ubicacion: 'x'.repeat(201),
        correo: 'sin-correo',
        telefono: 'abc',
      },
    });

    expect(componente.form.controls.correo.hasError('email')).toBe(true);
    expect(componente.form.controls.contrasena.hasError('minlength')).toBe(true);
    expect(componente.form.hasError('contrasenasNoCoinciden')).toBe(true);
    expect(componente.form.controls.organizacion.controls.nit.hasError('pattern')).toBe(true);
    expect(componente.form.controls.organizacion.controls.ubicacion.hasError('maxlength')).toBe(
      true,
    );
    expect(componente.form.controls.organizacion.controls.correo.hasError('email')).toBe(true);
    expect(componente.form.controls.organizacion.controls.telefono.hasError('pattern')).toBe(true);

    componente.solicitarConfirmacion();
    expect(componente.dialogoAbierto()).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('permite ubicación y teléfono vacíos, como en el DTO del backend', () => {
    const componente = fixture.componentInstance;
    completarFormulario(componente);
    componente.form.patchValue({ organizacion: { ubicacion: '', telefono: '' } });

    expect(componente.form.valid).toBe(true);
  });

  it('confirma el registro, envía el DTO correcto y no modifica la sesión del administrador', () => {
    const sesionAdmin = '{"token":"sesion-admin","usuario":{"rol":"ADMINISTRADOR"}}';
    sessionStorage.setItem('alimentared_sesion', sesionAdmin);
    api.post.mockReturnValueOnce(of(respuesta));
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    completarFormulario(componente);

    componente.solicitarConfirmacion();
    expect(componente.dialogoAbierto()).toBe(true);
    expect(api.post).not.toHaveBeenCalled();

    componente.confirmarRegistro();

    const cuerpo: RegistrarOrganizacionRequest = {
      nombre: 'Ana Responsable',
      correo: 'ana@example.com',
      contrasena: 'Secreto123',
      rol: 'RECEPTORA',
      organizacion: {
        nit: '900123456-7',
        nombre: 'Comedor Comunitario',
        ubicacion: 'Bogotá',
        correo: 'contacto@example.com',
        telefono: '+57 1234567',
      },
    };
    expect(api.post).toHaveBeenCalledWith('auth/register', cuerpo);
    expect(api.patch).not.toHaveBeenCalled();
    expect(mensajes.exito).toHaveBeenCalledWith(
      'Organización registrada. Está pendiente de verificación.',
    );
    expect(sessionStorage.getItem('alimentared_sesion')).toBe(sesionAdmin);
  });

  it('registra y verifica usando el id de usuario.organizacion de la respuesta', () => {
    api.post.mockReturnValueOnce(of(respuesta));
    api.patch.mockReturnValueOnce(of(respuesta.usuario.organizacion));
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    completarFormulario(componente);
    componente.form.controls.verificarAhora.setValue(true);
    componente.solicitarConfirmacion();
    componente.confirmarRegistro();

    expect(api.post).toHaveBeenCalledWith(
      'auth/register',
      expect.objectContaining({ rol: 'RECEPTORA' }),
    );
    expect(api.patch).toHaveBeenCalledWith('organizaciones/31/verificar', null);
    expect(mensajes.exito).toHaveBeenCalledWith('Organización registrada y verificada.');
    expect(componente.form.controls.verificarAhora.value).toBe(false);
  });

  it('muestra el mensaje y los detalles del backend ante un registro duplicado', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        status: 409,
        codigo: 'NIT_DUPLICADO',
        mensaje: 'El NIT ya está registrado.',
        detalles: ['Usa otro NIT'],
      },
    });
    api.post.mockReturnValueOnce(throwError(() => error));
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    completarFormulario(componente);
    componente.solicitarConfirmacion();
    componente.confirmarRegistro();
    fixture.detectChanges();

    expect(mensajes.error).toHaveBeenCalledWith(
      'El NIT ya está registrado. Detalles: Usa otro NIT',
    );
    expect(fixture.nativeElement.textContent).toContain('Usa otro NIT');
    expect(componente.form.controls.nombre.value).toBe('  Ana Responsable  ');
  });

  it('explica el éxito parcial si el registro se completa pero falla la verificación', () => {
    api.post.mockReturnValueOnce(of(respuesta));
    api.patch.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { mensaje: 'Servicio temporalmente no disponible.', detalles: [] },
          }),
      ),
    );
    const componente = fixture.componentInstance;
    completarFormulario(componente);
    componente.form.controls.verificarAhora.setValue(true);
    componente.solicitarConfirmacion();
    componente.confirmarRegistro();

    expect(mensajes.error).toHaveBeenCalledWith(
      'La organización se registró, pero no se pudo verificar. Servicio temporalmente no disponible.',
    );
    expect(api.patch).toHaveBeenCalledWith('organizaciones/31/verificar', null);
    expect(componente.form.controls.nombre.value).toBe('');
  });
});
