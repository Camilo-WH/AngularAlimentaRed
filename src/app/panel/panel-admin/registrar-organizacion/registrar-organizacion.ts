import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import {
  mensajeErrorAdminGestion,
  RegistrarOrganizacionRequest,
  RegistrarOrganizacionResponse,
  RolOrganizacion,
} from '../../../core/modelos-admin-gestion';
import { OrganizacionDto } from '../../../core/modelos-admin';
import { DialogoConfirmacionComponent } from '../../../shared/confirmacion/dialogo-confirmacion.component';
import { IndicadorCargaComponent } from '../../../shared/carga/indicador-carga.component';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

const contrasenasCoinciden: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const contrasena = control.get('contrasena')?.value;
  const repetirContrasena = control.get('repetirContrasena')?.value;
  return !repetirContrasena || contrasena === repetirContrasena
    ? null
    : { contrasenasNoCoinciden: true };
};

@Component({
  selector: 'app-registrar-organizacion',
  standalone: true,
  imports: [DialogoConfirmacionComponent, IndicadorCargaComponent, ReactiveFormsModule],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Registrar organización</h2>
        <p class="resumen">
          Crea una cuenta de donante o receptora. La organización quedará pendiente de verificación,
          salvo que elijas verificarla ahora.
        </p>
      </header>

      @if (errorRegistro()) {
        <p class="alerta error" role="alert">{{ errorRegistro() }}</p>
      }
      @if (exitoRegistro()) {
        <p class="alerta exito" role="status">{{ exitoRegistro() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="solicitarConfirmacion()">
        <fieldset [disabled]="procesando()">
          <legend>Datos de la cuenta</legend>
          <div class="campos">
            <label>
              Nombre de la persona responsable
              <input type="text" formControlName="nombre" maxlength="120" autocomplete="name" />
              @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
                @if (
                  form.controls.nombre.hasError('required') ||
                  form.controls.nombre.hasError('pattern')
                ) {
                  <small class="error">El nombre es obligatorio.</small>
                }
                @if (form.controls.nombre.hasError('maxlength')) {
                  <small class="error">El nombre no puede superar 120 caracteres.</small>
                }
              }
            </label>

            <label>
              Correo de la cuenta
              <input type="email" formControlName="correo" maxlength="150" autocomplete="email" />
              @if (form.controls.correo.touched && form.controls.correo.invalid) {
                @if (form.controls.correo.hasError('required')) {
                  <small class="error">El correo es obligatorio.</small>
                } @else if (form.controls.correo.hasError('email')) {
                  <small class="error">Ingresa un correo válido.</small>
                }
                @if (form.controls.correo.hasError('maxlength')) {
                  <small class="error">El correo no puede superar 150 caracteres.</small>
                }
              }
            </label>

            <label>
              Contraseña
              <input
                type="password"
                formControlName="contrasena"
                minlength="8"
                maxlength="72"
                autocomplete="new-password"
              />
              @if (form.controls.contrasena.touched && form.controls.contrasena.invalid) {
                @if (form.controls.contrasena.hasError('required')) {
                  <small class="error">La contraseña es obligatoria.</small>
                }
                @if (
                  form.controls.contrasena.hasError('minlength') ||
                  form.controls.contrasena.hasError('maxlength')
                ) {
                  <small class="error">Debe tener entre 8 y 72 caracteres.</small>
                }
                @if (form.controls.contrasena.hasError('pattern')) {
                  <small class="error">Debe contener al menos una letra y un número.</small>
                }
              }
            </label>

            <label>
              Repetir contraseña
              <input
                type="password"
                formControlName="repetirContrasena"
                autocomplete="new-password"
              />
              @if (
                form.controls.repetirContrasena.touched &&
                form.controls.repetirContrasena.hasError('required')
              ) {
                <small class="error">Repite la contraseña.</small>
              } @else if (
                form.controls.repetirContrasena.touched && form.hasError('contrasenasNoCoinciden')
              ) {
                <small class="error">Las contraseñas no coinciden.</small>
              }
            </label>

            <label>
              Tipo de organización
              <select formControlName="rol">
                <option value="">Selecciona un tipo</option>
                <option value="DONANTE">Donante</option>
                <option value="RECEPTORA">Receptora</option>
              </select>
              @if (form.controls.rol.touched && form.controls.rol.invalid) {
                <small class="error">Selecciona Donante o Receptora.</small>
              }
            </label>
          </div>

          <fieldset class="organizacion" formGroupName="organizacion">
            <legend>Datos de la organización</legend>
            <div class="campos">
              <label>
                NIT
                <input type="text" formControlName="nit" maxlength="17" autocomplete="off" />
                @if (
                  form.controls.organizacion.controls.nit.touched &&
                  form.controls.organizacion.controls.nit.invalid
                ) {
                  @if (form.controls.organizacion.controls.nit.hasError('required')) {
                    <small class="error">El NIT es obligatorio.</small>
                  } @else if (form.controls.organizacion.controls.nit.hasError('pattern')) {
                    <small class="error"
                      >Usa 6 a 15 dígitos, opcionalmente seguidos de guion y un dígito.</small
                    >
                  }
                }
              </label>

              <label>
                Nombre de la organización
                <input type="text" formControlName="nombre" maxlength="150" />
                @if (
                  form.controls.organizacion.controls.nombre.touched &&
                  form.controls.organizacion.controls.nombre.invalid
                ) {
                  @if (
                    form.controls.organizacion.controls.nombre.hasError('required') ||
                    form.controls.organizacion.controls.nombre.hasError('pattern')
                  ) {
                    <small class="error">El nombre de la organización es obligatorio.</small>
                  }
                  @if (form.controls.organizacion.controls.nombre.hasError('maxlength')) {
                    <small class="error">No puede superar 150 caracteres.</small>
                  }
                }
              </label>

              <label>
                Ubicación <span class="opcional">(opcional)</span>
                <input type="text" formControlName="ubicacion" maxlength="200" />
                @if (
                  form.controls.organizacion.controls.ubicacion.touched &&
                  form.controls.organizacion.controls.ubicacion.hasError('maxlength')
                ) {
                  <small class="error">La ubicación no puede superar 200 caracteres.</small>
                }
              </label>

              <label>
                Correo de la organización
                <input type="email" formControlName="correo" maxlength="150" autocomplete="off" />
                @if (
                  form.controls.organizacion.controls.correo.touched &&
                  form.controls.organizacion.controls.correo.invalid
                ) {
                  @if (form.controls.organizacion.controls.correo.hasError('required')) {
                    <small class="error">El correo de la organización es obligatorio.</small>
                  } @else if (form.controls.organizacion.controls.correo.hasError('email')) {
                    <small class="error">Ingresa un correo válido.</small>
                  }
                  @if (form.controls.organizacion.controls.correo.hasError('maxlength')) {
                    <small class="error">No puede superar 150 caracteres.</small>
                  }
                }
              </label>

              <label>
                Teléfono <span class="opcional">(opcional)</span>
                <input type="tel" formControlName="telefono" maxlength="30" autocomplete="tel" />
                @if (
                  form.controls.organizacion.controls.telefono.touched &&
                  form.controls.organizacion.controls.telefono.invalid
                ) {
                  <small class="error">Usa de 7 a 30 dígitos, espacios, + o guiones.</small>
                }
              </label>
            </div>
          </fieldset>

          <label class="verificar">
            <input type="checkbox" formControlName="verificarAhora" />
            Verificar ahora
          </label>
          <p class="ayuda">
            Al marcar esta opción, la organización se verificará después de crear la cuenta.
          </p>
        </fieldset>

        <button type="submit" [disabled]="procesando()">
          {{ procesando() ? 'Procesando...' : 'Registrar organización' }}
        </button>
      </form>

      <p class="estado" aria-live="polite">Completa los datos para registrar una organización.</p>

      <app-dialogo-confirmacion
        [abierto]="dialogoAbierto()"
        [titulo]="tituloDialogo()"
        [mensaje]="mensajeDialogo()"
        [textoConfirmar]="textoConfirmar()"
        (confirmado)="confirmarRegistro()"
        (cancelado)="cerrarDialogo()"
      />
      <app-indicador-carga [visible]="procesando()" [texto]="textoCarga()" />
    </section>
  `,
  styles: [
    `
      h2 {
        margin: 0;
      }
      .resumen,
      .estado,
      .ayuda {
        color: #647168;
      }
      .resumen {
        margin: 5px 0 16px;
      }
      form,
      .organizacion {
        padding: 18px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
      }
      legend {
        padding: 0 6px;
        font-weight: 600;
      }
      .campos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
        gap: 14px;
        margin: 10px 0;
      }
      label {
        display: grid;
        align-content: start;
        gap: 5px;
        color: #34443a;
        font-size: 14px;
      }
      input:not([type='checkbox']),
      select {
        width: 100%;
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        background: #fff;
        color: #1f2a22;
        font: inherit;
      }
      .organizacion {
        margin: 20px 0 16px;
      }
      .verificar {
        display: flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
      }
      .opcional {
        color: #647168;
        font-size: 12px;
      }
      .ayuda {
        margin: 5px 0 16px 24px;
        font-size: 13px;
      }
      .error {
        color: #991b1b;
        font-size: 12px;
      }
      .alerta {
        margin: 12px 0;
        padding: 12px 14px;
        border-radius: 6px;
      }
      .alerta.error {
        background: #fee2e2;
      }
      .alerta.exito {
        background: #dcfce7;
        color: #166534;
      }
      button {
        margin-top: 16px;
        padding: 9px 15px;
        border: 0;
        border-radius: 6px;
        background: #2e7d32;
        color: #fff;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .estado {
        margin-top: 12px;
        font-size: 13px;
      }
      @media (max-width: 600px) {
        form,
        .organizacion {
          padding: 14px;
        }
      }
    `,
  ],
})
export class RegistrarOrganizacion {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly registrando = signal(false);
  readonly verificando = signal(false);
  readonly procesando = computed(() => this.registrando() || this.verificando());
  readonly errorRegistro = signal<string | null>(null);
  readonly exitoRegistro = signal<string | null>(null);
  readonly dialogoAbierto = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
        ],
      ],
      repetirContrasena: ['', Validators.required],
      rol: this.fb.nonNullable.control<RolOrganizacion | ''>('', Validators.required),
      verificarAhora: false,
      organizacion: this.fb.nonNullable.group({
        nit: ['', [Validators.required, Validators.pattern(/^[0-9]{6,15}(-[0-9])?$/)]],
        nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
        ubicacion: ['', Validators.maxLength(200)],
        correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        telefono: ['', Validators.pattern(/^[0-9+\- ]{7,30}$/)],
      }),
    },
    { validators: contrasenasCoinciden },
  );

  readonly textoCarga = computed(() =>
    this.verificando() ? 'Verificando organización...' : 'Registrando organización...',
  );

  tituloDialogo(): string {
    return this.form.controls.verificarAhora.value
      ? 'Registrar y verificar organización'
      : 'Confirmar registro de organización';
  }

  mensajeDialogo(): string {
    const nombre = this.form.controls.organizacion.controls.nombre.value.trim();
    return this.form.controls.verificarAhora.value
      ? `¿Registrar a ${nombre} y verificarla ahora?`
      : `¿Registrar a ${nombre}? La organización quedará pendiente de verificación.`;
  }

  textoConfirmar(): string {
    return this.form.controls.verificarAhora.value
      ? 'Registrar y verificar'
      : 'Registrar organización';
  }

  solicitarConfirmacion(): void {
    this.errorRegistro.set(null);
    this.exitoRegistro.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.procesando()) {
      return;
    }
    this.dialogoAbierto.set(true);
  }

  cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
  }

  confirmarRegistro(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.procesando()) {
      this.dialogoAbierto.set(false);
      return;
    }

    const valores = this.form.getRawValue();
    if (valores.rol !== 'DONANTE' && valores.rol !== 'RECEPTORA') {
      this.dialogoAbierto.set(false);
      return;
    }

    const cuerpo: RegistrarOrganizacionRequest = {
      nombre: valores.nombre.trim(),
      correo: valores.correo.trim(),
      contrasena: valores.contrasena,
      rol: valores.rol,
      organizacion: {
        nit: valores.organizacion.nit.trim(),
        nombre: valores.organizacion.nombre.trim(),
        ubicacion: valores.organizacion.ubicacion.trim(),
        correo: valores.organizacion.correo.trim(),
        telefono: valores.organizacion.telefono.trim(),
      },
    };
    const verificarAhora = valores.verificarAhora;

    this.dialogoAbierto.set(false);
    this.errorRegistro.set(null);
    this.exitoRegistro.set(null);
    this.registrando.set(true);
    this.api
      .post<RegistrarOrganizacionRequest, RegistrarOrganizacionResponse>('auth/register', cuerpo)
      .subscribe({
        next: (respuesta) => {
          if (!verificarAhora) {
            this.registrando.set(false);
            this.limpiarFormulario();
            const mensaje = 'Organización registrada. Está pendiente de verificación.';
            this.exitoRegistro.set(mensaje);
            this.mensajes.exito(mensaje);
            return;
          }

          const idOrganizacion = respuesta.usuario?.organizacion?.id;
          if (!Number.isInteger(idOrganizacion) || idOrganizacion <= 0) {
            this.registrando.set(false);
            this.limpiarFormulario();
            this.mostrarError(
              'La organización se registró, pero la respuesta no incluyó un identificador válido para verificarla.',
            );
            return;
          }

          this.registrando.set(false);
          this.verificando.set(true);
          this.api
            .patch<null, OrganizacionDto>(`organizaciones/${idOrganizacion}/verificar`, null)
            .subscribe({
              next: () => {
                this.verificando.set(false);
                this.limpiarFormulario();
                const mensaje = 'Organización registrada y verificada.';
                this.exitoRegistro.set(mensaje);
                this.mensajes.exito(mensaje);
              },
              error: (error: unknown) => {
                this.verificando.set(false);
                this.limpiarFormulario();
                this.mostrarError(
                  `La organización se registró, pero no se pudo verificar. ${this.mensajeError(
                    error,
                    'Intenta verificarla desde la sección correspondiente.',
                  )}`,
                );
              },
            });
        },
        error: (error: unknown) => {
          this.registrando.set(false);
          this.mostrarError(this.mensajeError(error, 'No se pudo registrar la organización.'));
        },
      });
  }

  private limpiarFormulario(): void {
    this.form.reset({
      nombre: '',
      correo: '',
      contrasena: '',
      repetirContrasena: '',
      rol: '',
      verificarAhora: false,
      organizacion: {
        nit: '',
        nombre: '',
        ubicacion: '',
        correo: '',
        telefono: '',
      },
    });
  }

  private mostrarError(mensaje: string): void {
    this.errorRegistro.set(mensaje);
    this.mensajes.error(mensaje);
  }

  private mensajeError(error: unknown, porDefecto: string): string {
    const cuerpo = error instanceof HttpErrorResponse ? error.error : null;
    return mensajeErrorAdminGestion(cuerpo, porDefecto);
  }
}
