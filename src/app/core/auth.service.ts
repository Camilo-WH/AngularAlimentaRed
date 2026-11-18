import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { GoogleLoginRequest, LoginRequest, LoginResponse, Rol, Usuario } from './modelos';

interface Sesion {
  token: string;
  expiraEn: number; // momento (en milisegundos) en que vence el token
  usuario: Usuario;
}

const CLAVE_SESION = 'alimentared_sesion';

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
    const datos: GoogleLoginRequest = { idToken };
    return this.api
      .post<GoogleLoginRequest, LoginResponse>('auth/google', datos)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  private guardarSesion(respuesta: LoginResponse): void {
    const sesion: Sesion = {
      token: respuesta.token,
      expiraEn: Date.now() + respuesta.expiraEnSegundos * 1000,
      usuario: respuesta.usuario,
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