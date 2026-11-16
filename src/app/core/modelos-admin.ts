// Tipos de las respuestas de la API usadas por las pantallas del administrador

export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}

export interface OrganizacionDto {
  id: number;
  nit: string;
  nombre: string;
  ubicacion: string | null;
  correo: string;
  telefono: string | null;
  verificada: boolean;
  bloqueada: boolean;
  strikesVigentes: number;
  fechaRegistro: string;
}
