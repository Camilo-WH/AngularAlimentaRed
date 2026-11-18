export type Rol = 'DONANTE' | 'RECEPTORA' | 'COORDINADOR' | 'ADMINISTRADOR';

// Roles que pueden entrar al panel web. Para permitir al coordinador,
// agrega 'COORDINADOR' a esta lista.
export const ROLES_PANEL: Rol[] = ['ADMINISTRADOR'];

export interface Organizacion {
  id: number;
  nit: string;
  nombre: string;
  ubicacion: string;
  correo: string;
  telefono: string;
  verificada: boolean;
  bloqueada: boolean;
  strikesVigentes: number;
  fechaRegistro: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fechaRegistro: string;
  organizacion: Organizacion | null;
}

export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface GoogleLoginRequest {
  idToken: string;
  correo?: string;
  nombre?: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  usuario: Usuario;
}
