import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, rutaPanelPorRol } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="login">
      <form class="tarjeta" [formGroup]="form" (ngSubmit)="ingresar()">
        <h1>AlimentaRed</h1>
        <p class="subtitulo">Panel administrativo</p>

        <label for="correo">Correo</label>
        <input id="correo" type="email" formControlName="correo" autocomplete="username" />
        @if (form.controls.correo.touched && form.controls.correo.invalid) {
          <small class="error">Ingresa un correo válido.</small>
        }

        <label for="contrasena">Contraseña</label>
        <input
          id="contrasena"
          type="password"
          formControlName="contrasena"
          autocomplete="current-password"
        />
        @if (form.controls.contrasena.touched && form.controls.contrasena.invalid) {
          <small class="error">Ingresa tu contraseña.</small>
        }

        @if (error()) {
          <div class="alerta">{{ error() }}</div>
        }

        <button type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Ingresando...' : 'Ingresar' }}
        </button>

        @if (cargando()) {
          <small class="ayuda">Si el servidor estaba inactivo, puede tardar hasta un minuto.</small>
        }
      </form>
    </main>
  `,
  styles: [
    `
      .login {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        font-family: system-ui, sans-serif;
      }
      .tarjeta {
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 32px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      h1 {
        margin: 0;
        font-size: 24px;
      }
      .subtitulo {
        margin: 0 0 16px;
        color: #6b7280;
      }
      label {
        font-size: 14px;
        margin-top: 8px;
      }
      input {
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 15px;
      }
      button {
        margin-top: 16px;
        padding: 11px;
        border: 0;
        border-radius: 8px;
        background: #2e7d32;
        color: #fff;
        font-size: 15px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: #b91c1c;
      }
      .alerta {
        margin-top: 8px;
        padding: 10px;
        border-radius: 8px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 14px;
      }
      .ayuda {
        color: #6b7280;
        text-align: center;
      }
    `,
  ],
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const destino = rutaPanelPorRol(this.auth.usuario()?.rol ?? null);
        if (!destino) {
          this.auth.limpiarSesion();
          this.cargando.set(false);
          this.error.set('Tu cuenta no tiene acceso a los paneles administrativos.');
          return;
        }
        this.router.navigateByUrl(destino);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  private mensaje(e: HttpErrorResponse): string {
    if (e.status === 0) {
      return 'No se pudo conectar con el servidor. Si estaba inactivo, espera un minuto e intenta de nuevo.';
    }
    if (e.status === 400 || e.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }
    if (e.status === 403) {
      return 'Tu cuenta está bloqueada o inactiva. Contacta al administrador.';
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}