export type Rol = 'DONANTE' | 'RECEPTORA' | 'COORDINADOR' | 'ADMINISTRADOR';

export type RolPanel = Extract<Rol, 'ADMINISTRADOR' | 'COORDINADOR'>;

export interface EnlaceMenu {
  ruta: string;
  titulo: string;
}

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

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  usuario: Usuario;
}

export interface ColumnaTabla<T extends object> {
  clave: keyof T;
  titulo: string;
}
