import type { LoginResponse, Organizacion, Usuario } from './modelos';

export type RolOrganizacion = 'DONANTE' | 'RECEPTORA';

export interface OrganizacionRegistroRequest {
  nit: string;
  nombre: string;
  ubicacion: string;
  correo: string;
  telefono: string;
}

export interface RegistrarOrganizacionRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: RolOrganizacion;
  organizacion: OrganizacionRegistroRequest;
}

export type RegistrarOrganizacionResponse = Omit<LoginResponse, 'usuario'> & {
  usuario: Omit<Usuario, 'organizacion'> & { organizacion: Organizacion };
};

export interface ErrorApiAdminGestion {
  status: number;
  codigo: string;
  mensaje: string;
  detalles: string[];
}

export function mensajeErrorAdminGestion(cuerpo: unknown, porDefecto: string): string {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return porDefecto;
  }

  const respuesta = cuerpo as Partial<ErrorApiAdminGestion>;
  const mensaje = typeof respuesta.mensaje === 'string' ? respuesta.mensaje.trim() : '';
  const detalles = Array.isArray(respuesta.detalles)
    ? respuesta.detalles.filter(
        (detalle): detalle is string => typeof detalle === 'string' && detalle.trim().length > 0,
      )
    : [];
  const texto = mensaje || porDefecto;
  return detalles.length > 0 ? `${texto} Detalles: ${detalles.join(' · ')}` : texto;
}
