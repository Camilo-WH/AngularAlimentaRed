import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, Rol, Usuario } from './modelos';

interface Sesion {
  token: string;
  expiraEn: number; // momento (en milisegundos) en que vence el token
  usuario: Usuario;
}

const CLAVE_SESION = 'alimentared_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sesion = signal<Sesion | null>(this.leerSesion());

  readonly usuario = computed<Usuario | null>(() => this.sesion()?.usuario ?? null);

  /** Devuelve el token solo si existe y no ha vencido. */
  get token(): string | null {
    const s = this.sesion();
    return s && Date.now() < s.expiraEn ? s.token : null;
  }

  estaAutenticado(): boolean {
    return this.token !== null;
  }

  tieneRol(roles: Rol[]): boolean {
    const u = this.sesion()?.usuario;
    return !!u && roles.includes(u.rol);
  }

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, datos).pipe(
      tap((respuesta) => {
        const sesion: Sesion = {
          token: respuesta.token,
          expiraEn: Date.now() + respuesta.expiraEnSegundos * 1000,
          usuario: respuesta.usuario,
        };
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        this.sesion.set(sesion);
      }),
    );
  }

  /** Borra la sesión sin cambiar de pantalla. */
  limpiarSesion(): void {
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesion.set(null);
  }

  /** Cierra la sesión y lleva al login. */
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  private leerSesion(): Sesion | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE_SESION);
      return crudo ? (JSON.parse(crudo) as Sesion) : null;
    } catch {
      return null;
    }
  }
}