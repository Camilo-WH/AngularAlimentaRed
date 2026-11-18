import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService, rutaPanelPorRol } from '../core/auth.service';
import { BotonTemaComponent } from '../shared/tema/boton-tema.component';
import { LogoMarcaComponent } from '../shared/marca/logo-marca.component';

interface CredencialGoogle {
  credential: string;
}

interface ConfiguracionGoogle {
  client_id: string;
  callback: (respuesta: CredencialGoogle) => void;
}

interface ApiGoogle {
  accounts: {
    id: {
      initialize(configuracion: ConfiguracionGoogle): void;
      renderButton(elemento: HTMLElement, opciones: Record<string, string | number>): void;
    };
  };
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, BotonTemaComponent, LogoMarcaComponent],
  template: `
    <main class="login">
      <section class="panel-marca" aria-label="AlimentaRed">
        <div class="marca-contenido">
          <app-logo-marca tamano="grande" />
          <p class="frase-marca">
            Rescatamos alimentos y los llevamos a quienes más los necesitan.
          </p>
          <div class="detalle-marca" aria-hidden="true">
            <svg viewBox="0 0 420 300" fill="none">
              <path d="M36 232c70-83 111-124 172-152 61-28 122-30 177-18" />
              <path d="M119 174c-6-41 12-73 53-96 14 42-4 74-53 96Z" />
              <path d="M224 121c17-39 49-58 96-57-10 45-42 64-96 57Z" />
              <path d="M173 207c35-30 72-40 111-30-24 39-61 49-111 30Z" />
              <circle cx="345" cy="214" r="37" />
            </svg>
          </div>
        </div>
      </section>

      <section class="panel-ingreso" aria-labelledby="titulo-ingreso">
        <header class="acciones">
          <app-boton-tema />
        </header>
        <div class="formulario-contenedor">
          <form class="tarjeta" [formGroup]="form" (ngSubmit)="ingresar()">
            <div class="encabezado-formulario">
              <span class="sobrelinea">AlimentaRed</span>
              <h1 id="titulo-ingreso">Ingreso al portal</h1>
              <p class="subtitulo">Panel administrativo</p>
            </div>

            <div class="campo">
              <label for="correo">Correo</label>
              <div class="control">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <input
                  id="correo"
                  type="email"
                  formControlName="correo"
                  autocomplete="username"
                />
              </div>
              @if (form.controls.correo.touched && form.controls.correo.invalid) {
                <small class="error">Ingresa un correo válido.</small>
              }
            </div>

            <div class="campo">
              <label for="contrasena">Contraseña</label>
              <div class="control">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
                </svg>
                <input
                  id="contrasena"
                  type="password"
                  formControlName="contrasena"
                  autocomplete="current-password"
                />
              </div>
              @if (form.controls.contrasena.touched && form.controls.contrasena.invalid) {
                <small class="error">Ingresa tu contraseña.</small>
              }
            </div>

            @if (error()) {
              <div class="alerta" role="alert">{{ error() }}</div>
            }

            <button class="ingresar" type="submit" [disabled]="cargando()">
              <span>{{ cargando() ? 'Ingresando...' : 'Ingresar' }}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>

            <div #botonGoogle class="google"></div>

            @if (cargando()) {
              <small class="ayuda">
                Si el servidor estaba inactivo, puede tardar hasta un minuto.
              </small>
            }
          </form>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .login {
        display: grid;
        min-height: 100vh;
        min-height: 100svh;
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        background: var(--color-fondo);
      }

      .panel-marca {
        position: relative;
        display: grid;
        align-items: center;
        overflow: hidden;
        padding: clamp(36px, 7vw, 100px);
        isolation: isolate;
        background:
          radial-gradient(
            ellipse at 12% 10%,
            color-mix(in srgb, var(--color-panel-marca-acento) 22%, transparent),
            transparent 40%
          ),
          radial-gradient(
            ellipse at 88% 90%,
            color-mix(in srgb, var(--color-panel-marca-suave) 18%, transparent),
            transparent 38%
          ),
          linear-gradient(
            145deg,
            var(--color-panel-marca),
            var(--color-panel-marca-medio) 55%,
            var(--color-panel-marca)
          );
        color: var(--color-panel-marca-texto);
      }

      .marca-contenido {
        position: relative;
        z-index: 1;
        width: min(100%, 560px);
        margin-inline: auto;
      }

      .frase-marca {
        max-width: 480px;
        margin: 28px 0 0;
        color: var(--color-panel-marca-texto);
        font-family: var(--fuente-titulos);
        font-size: clamp(1.75rem, 3.2vw, 3rem);
        font-weight: var(--peso-semibold);
        line-height: 1.2;
        letter-spacing: -0.035em;
      }

      .detalle-marca {
        position: absolute;
        right: 2%;
        bottom: -155px;
        z-index: -1;
        width: min(88%, 420px);
        color: var(--color-panel-marca-acento);
        opacity: 0.25;
        transform: rotate(-8deg);
      }

      .detalle-marca svg {
        display: block;
        width: 100%;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .panel-ingreso {
        display: flex;
        min-width: 0;
        flex-direction: column;
        padding: 28px clamp(24px, 5vw, 72px);
      }

      .acciones {
        display: flex;
        justify-content: flex-end;
      }

      .formulario-contenedor {
        display: grid;
        flex: 1;
        align-items: center;
        padding-block: 36px;
      }

      .tarjeta {
        display: flex;
        width: min(100%, 460px);
        flex-direction: column;
        gap: 20px;
        margin-inline: auto;
        padding: clamp(28px, 4vw, 44px);
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-tarjeta);
        background: var(--color-superficie);
        box-shadow: var(--sombra-tarjeta);
      }

      .encabezado-formulario {
        margin-bottom: 4px;
      }

      .sobrelinea {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 8px 0 4px;
        color: var(--color-texto);
        font-family: var(--fuente-titulos);
        font-size: clamp(1.65rem, 3vw, 2rem);
        font-weight: var(--peso-bold);
        letter-spacing: -0.035em;
        line-height: 1.2;
      }

      .subtitulo {
        margin: 0;
        color: var(--color-texto-secundario);
      }

      .campo {
        display: grid;
        gap: 8px;
      }

      label {
        color: var(--color-texto);
        font-size: var(--texto-sm);
        font-weight: var(--peso-semibold);
      }

      .control {
        position: relative;
      }

      .control svg {
        position: absolute;
        top: 50%;
        left: 14px;
        width: 20px;
        height: 20px;
        color: var(--color-texto-secundario);
        pointer-events: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
        transform: translateY(-50%);
      }

      input {
        width: 100%;
        min-height: 48px;
        padding: 11px 14px 11px 44px;
        border: 1px solid var(--color-borde);
        border-radius: var(--radio-control);
        background: var(--color-fondo);
        color: var(--color-texto);
        font-size: var(--texto-base);
      }

      .ingresar {
        display: flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 2px;
        padding: 12px 18px;
        border: 1px solid transparent;
        border-radius: var(--radio-control);
        background: var(--color-acento);
        color: var(--color-acento-texto);
        font-size: var(--texto-base);
        font-weight: var(--peso-bold);
        cursor: pointer;
      }

      .ingresar:hover:not(:disabled) {
        background: var(--color-acento-hover);
      }

      .ingresar:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .ingresar svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .error {
        color: var(--color-error);
        font-size: var(--texto-sm);
      }

      .alerta {
        padding: 12px 14px;
        border: 1px solid var(--color-error);
        border-radius: var(--radio-control);
        background: var(--color-error-fondo);
        color: var(--color-error);
        font-size: var(--texto-sm);
      }

      .ayuda {
        color: var(--color-texto-secundario);
        font-size: var(--texto-sm);
        text-align: center;
      }

      .google {
        display: flex;
        justify-content: center;
        min-height: 40px;
      }

      @media (max-width: 760px) {
        .login {
          grid-template-columns: minmax(0, 1fr);
        }

        .panel-marca {
          display: none;
        }

        .panel-ingreso {
          min-height: 100vh;
          min-height: 100svh;
          padding: 20px clamp(16px, 5vw, 32px);
        }

        .formulario-contenedor {
          padding-block: 24px;
        }
      }

      @media (max-width: 380px) {
        .tarjeta {
          padding: 24px 20px;
        }
      }
    `,
  ],
})
export class Login implements AfterViewInit {
  private readonly botonGoogle = viewChild<ElementRef<HTMLDivElement>>('botonGoogle');
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
      next: () => this.finalizarIngreso(),
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.mensaje(e));
      },
    });
  }

  ngAfterViewInit(): void {
    void this.configurarBotonGoogle();
  }

  private finalizarIngreso(): void {
    const destino = rutaPanelPorRol(this.auth.usuario()?.rol ?? null);
    if (!destino) {
      this.auth.limpiarSesion();
      this.cargando.set(false);
      this.error.set('Tu cuenta no tiene acceso a los paneles administrativos.');
      return;
    }
    this.router.navigateByUrl(destino);
  }

  private async configurarBotonGoogle(): Promise<void> {
    try {
      const google = await this.esperarGoogle();
      const contenedor = this.botonGoogle()?.nativeElement;
      if (!contenedor) {
        return;
      }
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (respuesta) => this.ingresarConGoogle(respuesta.credential),
      });
      google.accounts.id.renderButton(contenedor, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 100,
        text: 'continue_with',
        locale: 'es',
      });
    } catch {
      this.error.set('No se pudo cargar el inicio de sesión con Google.');
    }
  }

  private esperarGoogle(): Promise<ApiGoogle> {
    return new Promise((resolve, reject) => {
      const inicio = Date.now();
      const verificar = () => {
        const google = (window as Window & { google?: ApiGoogle }).google;
        if (google?.accounts?.id) {
          resolve(google);
          return;
        }
        if (Date.now() - inicio > 10000) {
          reject(new Error('Google no disponible'));
          return;
        }
        setTimeout(verificar, 100);
      };
      verificar();
    });
  }

  private ingresarConGoogle(idToken: string): void {
    if (!idToken) {
      this.error.set('No se pudo obtener el token de Google. Intenta de nuevo.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.loginConGoogle(idToken).subscribe({
      next: () => this.finalizarIngreso(),
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.mensajeGoogle(e));
      },
    });
  }

  private mensajeGoogle(e: HttpErrorResponse): string {
    if (e.status === 0) {
      return 'No se pudo conectar con el servidor. Si estaba inactivo, espera un minuto e intenta de nuevo.';
    }
    if (e.status === 400 || e.status === 401) {
      return 'No hay una cuenta de AlimentaRed asociada a ese correo de Google.';
    }
    if (e.status === 403) {
      return 'Tu cuenta está bloqueada o inactiva. Contacta al administrador.';
    }
    return 'No se pudo iniciar sesión con Google. Intenta de nuevo.';
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