import { DatePipe } from '@angular/common';
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
import { ApiService } from '../../../core/api.service';
import { MensajesService } from '../../../shared/mensajes/mensajes.service';

type RolInterno = 'COORDINADOR' | 'ADMINISTRADOR';

interface UsuarioInternoRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: RolInterno;
}

interface UsuarioDto {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaRegistro: string;
}

const ETIQUETAS_ROL: Record<string, string> = {
  COORDINADOR: 'Coordinador',
  ADMINISTRADOR: 'Administrador',
  DONANTE: 'Donante',
  RECEPTORA: 'Organización receptora',
};

// La contraseña y su repetición deben ser iguales
const coincidenContrasenas: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const contrasena = grupo.get('contrasena')?.value;
  const repetir = grupo.get('repetir')?.value;
  return contrasena === repetir ? null : { noCoinciden: true };
};

@Component({
  selector: 'app-gestionar-usuarios-roles',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="pagina">
      <header class="cabecera">
        <h2>Gestionar usuarios y roles</h2>
        <p class="resumen">
          Crea cuentas internas para el personal que opera la plataforma: coordinadores y
          administradores.
        </p>
      </header>

      <form class="formulario" [formGroup]="form" (ngSubmit)="crear()">
        <h3>Nuevo usuario interno</h3>

        <div class="campos">
          <label>
            Nombre
            <input type="text" formControlName="nombre" maxlength="120" />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <small class="error">Ingresa el nombre.</small>
            }
          </label>

          <label>
            Correo
            <input type="email" formControlName="correo" maxlength="150" autocomplete="off" />
            @if (form.controls.correo.touched && form.controls.correo.invalid) {
              <small class="error">Ingresa un correo válido.</small>
            }
          </label>

          <label>
            Rol
            <select formControlName="rol">
              <option value="COORDINADOR">Coordinador</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </label>

          <span></span>

          <label>
            Contraseña
            <input
              type="password"
              formControlName="contrasena"
              maxlength="72"
              autocomplete="new-password"
            />
            @if (form.controls.contrasena.touched && form.controls.contrasena.invalid) {
              <small class="error">
                Mínimo 8 caracteres, con al menos una letra y un número.
              </small>
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
            {{ guardando() ? 'Creando...' : 'Crear usuario' }}
          </button>
        </div>
      </form>

      <h3 class="subtitulo">Creados en esta sesión</h3>
      <p class="resumen">
        La API todavía no permite listar usuarios, por eso aquí solo aparecen los que creas desde
        esta pantalla.
      </p>

      @if (creados().length === 0) {
        <p class="estado">Aún no has creado usuarios en esta sesión.</p>
      } @else {
        <div class="contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Creado</th>
              </tr>
            </thead>
            <tbody>
              @for (usuario of creados(); track usuario.id) {
                <tr>
                  <td>{{ usuario.nombre }}</td>
                  <td>{{ usuario.correo }}</td>
                  <td>{{ etiqueta(usuario.rol) }}</td>
                  <td>{{ usuario.fechaRegistro | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [
    `
      h2,
      h3 {
        margin: 0;
      }
      .subtitulo {
        margin-top: 24px;
      }
      .resumen,
      .estado {
        color: #647168;
      }
      .formulario {
        margin: 16px 0 8px;
        padding: 16px;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
        color: #1f2a22;
      }
      .campos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin: 12px 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 14px;
      }
      input,
      select {
        padding: 9px 10px;
        border: 1px solid #cbd5ce;
        border-radius: 6px;
        font: inherit;
        color: #1f2a22;
        background: #fff;
      }
      .error {
        color: #b91c1c;
      }
      button {
        padding: 8px 14px;
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
      .contenedor {
        overflow-x: auto;
        border: 1px solid #e1e7e2;
        border-radius: 8px;
        background: #fff;
        color: #1f2a22;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid #e8ece9;
      }
      th {
        background: #f3f7f4;
        font-weight: 600;
      }
    `,
  ],
})
export class GestionarUsuariosRoles {
  private readonly api = inject(ApiService);
  private readonly mensajes = inject(MensajesService);
  private readonly fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly creados = signal<UsuarioDto[]>([]);

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      rol: this.fb.nonNullable.control<RolInterno>('COORDINADOR', Validators.required),
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

  etiqueta(rol: string): string {
    return ETIQUETAS_ROL[rol] ?? rol;
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();

    // Acción crítica: un administrador tiene acceso total
    if (valores.rol === 'ADMINISTRADOR') {
      const confirmado = window.confirm(
        `¿Crear a ${valores.nombre.trim()} como administrador? Tendrá acceso total al panel.`,
      );
      if (!confirmado) {
        return;
      }
    }

    const cuerpo: UsuarioInternoRequest = {
      nombre: valores.nombre.trim(),
      correo: valores.correo.trim(),
      contrasena: valores.contrasena,
      rol: valores.rol,
    };

    this.guardando.set(true);
    this.api.post<UsuarioInternoRequest, UsuarioDto>('usuarios', cuerpo).subscribe({
      next: (usuario) => {
        this.guardando.set(false);
        this.creados.update((lista) => [usuario, ...lista]);
        this.mensajes.exito(
          `Usuario ${usuario.nombre} creado como ${this.etiqueta(usuario.rol).toLowerCase()}.`,
        );
        this.form.reset({
          nombre: '',
          correo: '',
          rol: 'COORDINADOR',
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
      return 'Ya existe un usuario con ese correo.';
    }
    const cuerpo = e.error as { mensaje?: unknown; message?: unknown } | null;
    const texto = cuerpo?.mensaje ?? cuerpo?.message;
    return typeof texto === 'string' && texto.length > 0
      ? texto
      : 'No se pudo crear el usuario. Revisa los datos e intenta de nuevo.';
  }
}
