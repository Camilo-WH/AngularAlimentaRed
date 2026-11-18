import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { defer, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse, Rol, Usuario } from './modelos';

interface Sesion {
  token: string;
  expiraEn: number; // momento (en milisegundos) en que vence el token
  usuario: Usuario;
  google?: boolean;
}

interface PayloadGoogle {
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

const CLAVE_SESION = 'alimentared_sesion';

const ROLES_GOOGLE: Record<string, Rol> = {
  'yefersoncamiloblanco@gmail.com': 'ADMINISTRADOR',
  'correo.coordinador@gmail.com': 'COORDINADOR',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly sesion = signal<Sesion | null>(this.leerSesion());
  private temporizadorExpiracion: ReturnType<typeof setTimeout> | null = null;

  readonly usuario = computed<Usuario | null>(() => this.sesion()?.usuario ?? null);

  constructor() {
    this.programarExpiracion();
  }

  /** Devuelve el token solo si existe y no ha vencido. */
  get token(): string | null {
    return this.obtenerSesionVigente()?.token ?? null;
  }

  get esSesionGoogle(): boolean {
    return this.obtenerSesionVigente()?.google === true;
  }

  estaAutenticado(): boolean {
    return this.obtenerSesionVigente() !== null;
  }

  tieneRol(roles: Rol[]): boolean {
    const u = this.obtenerSesionVigente()?.usuario;
    return !!u && roles.includes(u.rol);
  }

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.api
      .post<LoginRequest, LoginResponse>('auth/login', datos)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  loginConGoogle(idToken: string): Observable<LoginResponse> {
    return defer(() => {
      const payload = this.decodificarIdToken(idToken);
      const emisor = payload.iss;
      const expira = payload.exp;

      if (
        payload.aud !== environment.googleClientId ||
        (emisor !== 'accounts.google.com' && emisor !== 'https://accounts.google.com')
      ) {
        throw new Error('El token de Google no es válido para esta aplicación.');
      }
      if (typeof expira !== 'number' || expira * 1000 <= Date.now()) {
        throw new Error('La sesión de Google venció. Intenta de nuevo.');
      }
      if (typeof payload.email !== 'string' || payload.email_verified !== true) {
        throw new Error('No se pudo verificar el correo de Google.');
      }

      const correo = payload.email.toLowerCase();
      const rol = ROLES_GOOGLE[correo];
      if (!rol) {
        throw new Error('Ese correo de Google no tiene acceso a los paneles administrativos.');
      }

      const usuario: Usuario = {
        id: 0,
        nombre: typeof payload.name === 'string' ? payload.name : correo,
        correo,
        rol,
        activo: true,
        fechaRegistro: new Date().toISOString(),
        organizacion: null,
      };
      const respuesta: LoginResponse = {
        token: idToken,
        tipo: 'Bearer',
        expiraEnSegundos: Math.max(0, expira - Math.floor(Date.now() / 1000)),
        usuario,
      };

      this.guardarSesion(respuesta, true);
      return of(respuesta);
    });
  }

  private decodificarIdToken(idToken: string): PayloadGoogle {
    const partes = idToken.split('.');
    if (partes.length !== 3) {
      throw new Error('El token de Google no es válido.');
    }
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));

    try {
      const binario = atob(base64 + relleno);
      const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes)) as PayloadGoogle;
    } catch {
      throw new Error('El token de Google no es válido.');
    }
  }

  private guardarSesion(respuesta: LoginResponse, google = false): void {
    const sesion: Sesion = {
      token: respuesta.token,
      expiraEn: Date.now() + respuesta.expiraEnSegundos * 1000,
      usuario: respuesta.usuario,
      google,
    };
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesion.set(sesion);
    this.programarExpiracion();
  }

  /** Borra la sesión sin cambiar de pantalla. */
  limpiarSesion(): void {
    if (this.temporizadorExpiracion !== null) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesion.set(null);
  }

  /** Cierra la sesión y lleva al login. */
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  private obtenerSesionVigente(): Sesion | null {
    const sesion = this.sesion();
    if (!sesion) {
      return null;
    }
    if (Date.now() >= sesion.expiraEn) {
      this.limpiarSesion();
      return null;
    }
    return sesion;
  }

  private programarExpiracion(): void {
    if (this.temporizadorExpiracion !== null) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
    const sesion = this.obtenerSesionVigente();
    if (sesion) {
      this.temporizadorExpiracion = setTimeout(
        () => this.logout(),
        Math.max(0, sesion.expiraEn - Date.now()),
      );
    }
  }

  private leerSesion(): Sesion | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE_SESION);
      if (!crudo) {
        return null;
      }
      const valor: unknown = JSON.parse(crudo);
      if (typeof valor !== 'object' || valor === null) {
        return null;
      }
      const posibleSesion = valor as Partial<Sesion>;
      if (
        typeof posibleSesion.token !== 'string' ||
        typeof posibleSesion.expiraEn !== 'number' ||
        typeof posibleSesion.usuario !== 'object' ||
        posibleSesion.usuario === null
      ) {
        return null;
      }
      return {
        token: posibleSesion.token,
        expiraEn: posibleSesion.expiraEn,
        usuario: posibleSesion.usuario,
        google: posibleSesion.google === true,
      };
    } catch {
      return null;
    }
  }
}

export function rutaPanelPorRol(rol: Rol | null): string | null {
  if (rol === 'ADMINISTRADOR') {
    return '/admin';
  }
  if (rol === 'COORDINADOR') {
    return '/coordinador';
  }
  return null;
}