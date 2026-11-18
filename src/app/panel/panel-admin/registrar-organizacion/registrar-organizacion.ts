import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

type TipoOrganizacion = 'DONANTE' | 'RECEPTORA';

interface RegistroRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: TipoOrganizacion;
  organizacion: {
    nit: string;
    nombre: string;
    ubicacion?: string;
    correo: string;
    telefono?: string;
  };
}

interface Registrada {
  nombre: string;
  tipo: string;
}

// La contraseña y su repetición deben ser iguales
const coincidenContrasenas: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const contrasena = grupo.get('contrasena')?.value;
  const repetir = grupo.get('repetir')?.value;
  return contrasena === repetir ? null : { noCoinciden: true };
};

@Component({
  selector: 'app-registrar-organizacion',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Registrar organización</h2>
        <p class="resumen">
          Registra una organización donante o receptora junto con su cuenta de acceso. Quedará
          pendiente de verificación hasta que un administrador la verifique.
        </p>
      </header>

      @if (registrada(); as reg) {
        <div class="exito">
          <strong>{{ reg.nombre }}</strong> se registró como {{ reg.tipo }} y quedó pendiente de
          verificación.
          <a routerLink="/admin/verificar-organizacion">Ir a verificar organizaciones</a>
        </div>
      }

      <form class="formulario" [formGroup]="form" (ngSubmit)="registrar()">
        <h3>Datos de la organización</h3>
        <div class="campos">
          <label>
            Tipo
            <select formControlName="tipo">
              <option value="DONANTE">Donante</option>
              <option value="RECEPTORA">Organización receptora</option>
            </select>
          </label>

          <label>
            NIT
            <input type="text" formControlName="nit" placeholder="900123456-7" />
            @if (form.controls.nit.touched && form.controls.nit.invalid) {
              <small class="error">Ingresa de 6 a 15 dígitos, con guion y dígito de verificación opcional.</small>
            }
          </label>

          <label>
            Nombre de la organización
            <input type="text" formControlName="nombreOrganizacion" maxlength="150" />
            @if (form.controls.nombreOrganizacion.touched && form.controls.nombreOrganizacion.invalid) {
              <small class="error">Ingresa el nombre.</small>
            }
          </label>

          <label>
            Correo de la organización
            <input type="email" formControlName="correoOrganizacion" maxlength="150" />
            @if (form.controls.correoOrganizacion.touched && form.controls.correoOrganizacion.invalid) {
              <small class="error">Ingresa un correo válido.</small>
            }
          </label>

          <label>
            Ubicación (opcional)
            <input type="text" formControlName="ubicacion" maxlength="200" />
          </label>

          <label>
            Teléfono (opcional)
            <input type="text" formControlName="telefono" maxlength="30" />
            @if (form.controls.telefono.touched && form.controls.telefono.invalid) {
              <small class="error">Usa de 7 a 30 caracteres: números, espacios, + o guion.</small>
            }
          </label>
        </div>

        <h3 class="seccion">Cuenta de acceso</h3>
        <div class="campos">
          <label>
            Nombre del responsable
            <input type="text" formControlName="nombreResponsable" maxlength="120" />
            @if (form.controls.nombreResponsable.touched && form.controls.nombreResponsable.invalid) {
              <small class="error">Ingresa el nombre del responsable.</small>
            }
          </label>

          <label>
            Correo de acceso
            <input type="email" formControlName="correoAcceso" maxlength="150" autocomplete="off" />
            @if (form.controls.correoAcceso.touched && form.controls.correoAcceso.invalid) {
              <small class="error">Ingresa un correo válido.</small>
            }
          </label>

          <label>
            Contraseña
            <input
              type="password"
              formControlName="contrasena"
              maxlength="72"
              autocomplete="new-password"
            />
            @if (form.controls.contrasena.touched && form.controls.contrasena.invalid) {
              <small class="error">Mínimo 8 caracteres, con al menos una letra y un número.</small>
            }
          </label>

          <label>
            Repite la contraseña
            <input
              type="password"
              formControlName="repetir"
              maxlength="72"
              autocomplete="new-password"
            />
            @if (form.controls.repetir.touched && form.hasError('noCoinciden')) {
              <small class="error">Las contraseñas no coinciden.</small>
            }
          </label>
        </div>

        <div class="acciones">
          <button type="submit" [disabled]="guardando()">
            {{ guardando() ? 'Registrando...' : 'Registrar organización' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      h2,
      h3 {
        margin: 0;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
      }
      .seccion {
        margin-top: 28px;
      }
      .resumen {
        color: var(--color-texto-secundario);
      }
      .exito {
        display: grid;
        gap: 8px;
        margin: 16px 0;
        padding: 12px 14px;
        border: 1px solid var(--color-exito);
        border-radius: var(--radio-control);
        background: var(--color-exito-fondo);
        color: var(--color-exito);
      }
      .exito a {
        color: var(--color-exito);
        font-weight: var(--peso-semibold);
      }
      .formulario {
        margin: 20px 0 12px;
        padding: clamp(18px, 2.5vw, 28px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        color: var(--color-texto);
        box-shadow: var(--sombra-tarjeta);
      }
      .campos {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin: 20px 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 7px;
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }
      input,
      select {
        width: 100%;
        min-height: 44px;
        padding: 10px 12px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font: inherit;
      }
      .error {
        color: var(--color-error);
        font-size: var(--texto-sm);
      }
      button {
        min-height: 42px;
        padding: 9px 16px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        background: var(--color-acento);
        color: var(--color-acento-texto);
        font-weight: var(--peso-semibold);
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--color-acento-hover);
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
    `,
  ],
})
export class RegistrarOrganizacion {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly registrada = signal<Registrada | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      tipo: this.fb.nonNullable.control<TipoOrganizacion>('RECEPTORA', Validators.required),
      nit: ['', [Validators.required, Validators.pattern(/^[0-9]{6,15}(-[0-9])?$/)]],
      nombreOrganizacion: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)],
      ],
      correoOrganizacion: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(150)],
      ],
      ubicacion: ['', Validators.maxLength(200)],
      telefono: ['', Validators.pattern(/^[0-9+\- ]{7,30}$/)],
      nombreResponsable: [
        '',
        [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)],
      ],
      correoAcceso: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
        ],
      ],
      repetir: ['', Validators.required],
    },
    { validators: coincidenContrasenas },
  );

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const cuerpo: RegistroRequest = {
      nombre: v.nombreResponsable.trim(),
      correo: v.correoAcceso.trim(),
      contrasena: v.contrasena,
      rol: v.tipo,
      organizacion: {
        nit: v.nit.trim(),
        nombre: v.nombreOrganizacion.trim(),
        correo: v.correoOrganizacion.trim(),
        // Los campos opcionales vacíos se omiten para que la API no los valide
        ubicacion: v.ubicacion.trim() || undefined,
        telefono: v.telefono.trim() || undefined,
      },
    };

    this.guardando.set(true);
    this.registrada.set(null);

    // La respuesta trae un token de la cuenta nueva; se descarta a propósito
    // para no tocar la sesión del administrador.
    this.api.post<RegistroRequest, unknown>('auth/register', cuerpo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.registrada.set({
          nombre: cuerpo.organizacion.nombre,
          tipo: v.tipo === 'DONANTE' ? 'donante' : 'organización receptora',
        });
        this.mensajes.exito('Organización registrada. Queda pendiente de verificación.');
        this.form.reset({
          tipo: 'RECEPTORA',
          nit: '',
          nombreOrganizacion: '',
          correoOrganizacion: '',
          ubicacion: '',
          telefono: '',
          nombreResponsable: '',
          correoAcceso: '',
          contrasena: '',
          repetir: '',
        });
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mensajes.error(this.textoError(e));
      },
    });
  }

  private textoError(e: HttpErrorResponse): string {
    if (e.status === 409) {
      return 'Ya existe una organización con ese NIT o un usuario con ese correo.';
    }
    const cuerpo = e.error as { mensaje?: unknown; message?: unknown } | null;
    const texto = cuerpo?.mensaje ?? cuerpo?.message;
    return typeof texto === 'string' && texto.length > 0
      ? texto
      : 'No se pudo registrar la organización. Revisa los datos e intenta de nuevo.';
  }
}