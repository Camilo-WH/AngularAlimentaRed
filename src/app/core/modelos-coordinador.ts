export interface PaginaCoordinador<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}

export type EstadoAsignacion =
  | 'ACTIVA'
  | 'RETIRO_PARCIAL'
  | 'COMPLETADA'
  | 'NO_RECOGIDA'
  | 'CANCELADA'
  | 'CERRADA_CON_RESTOCK';

export type EstadoEntrega = 'PARCIAL' | 'COMPLETA';

export interface AsignacionDto {
  id: number;
  solicitudId: number;
  loteId: number;
  loteNombre: string;
  unidadMedida: string;
  organizacionId: number;
  organizacionNombre: string;
  donanteId: number;
  donanteNombre: string;
  cantidadAsignada: number;
  cantidadRetirada: number;
  cantidadPendiente: number;
  estado: EstadoAsignacion;
  autoAsignada: boolean;
  fechaAsignacion: string;
  fechaLimiteRetiro: string;
  fechaCierre: string | null;
  ubicacion: string | null;
  instruccionesRecogida: string | null;
  contacto: string | null;
}

export interface EntregaDto {
  id: number;
  asignacionId: number;
  solicitudId: number;
  loteId: number;
  loteNombre: string;
  categoriaNombre: string;
  unidadMedida: string;
  donanteId: number;
  donanteNombre: string;
  receptoraId: number;
  receptoraNombre: string;
  cantidadRetirada: number;
  estado: EstadoEntrega;
  fechaEntrega: string;
  observaciones: string | null;
  responsable: string | null;
  fueraDeFranja: boolean;
}

export interface ErrorApiCoordinador {
  timestamp: string;
  status: number;
  error: string;
  codigo: string;
  mensaje: string;
  path: string;
  detalles: string[];
}

export interface CategoriaCoordinadorDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
}

export type EntidadAuditada =
  | 'LOTE'
  | 'SOLICITUD'
  | 'ASIGNACION'
  | 'INCIDENCIA'
  | 'ORGANIZACION'
  | 'STRIKE';

export interface HistorialEstadoDto {
  id: number;
  entidad: EntidadAuditada;
  entidadId: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  responsable: string | null;
  fecha: string;
  justificacion: string | null;
}

export type EstadoSolicitud =
  | 'APROBADO'
  | 'CANCELADO'
  | 'PENDIENTE'
  | 'RECHAZADA'
  | 'EXPIRADA'
  | 'COMPLETADA';

export interface SolicitudDto {
  id: number;
  loteId: number;
  loteNombre: string;
  unidadMedida: string;
  organizacionId: number;
  organizacionNombre: string;
  cantidadSolicitada: number;
  estado: EstadoSolicitud;
  enEmpate: boolean;
  fechaCreacion: string;
  fechaLimiteConfirmacion: string | null;
  fechaResolucion: string | null;
  motivoResolucion: string | null;
}

export interface ResolverSolicitudRequest {
  aprobada: boolean;
  motivo: string | null;
}

export interface ConfirmarSalidaRequestDto {
  cantidadRetirada: number;
  observaciones: string | null;
}

export interface NoRecogidaRequestDto {
  observaciones: string;
}

export interface RestockSobranteRequestDto {
  observaciones: string;
}

export type EstadoLoteCoordinador =
  | 'BORRADOR'
  | 'DISPONIBLE'
  | 'ASIGNADO'
  | 'ENTREGADO'
  | 'INCIDENCIA'
  | 'CANCELADO'
  | 'VENCIDO';

export interface IncidenciaCoordinadorDto {
  id: number;
  loteId: number;
  loteNombre: string;
  detalles: string;
  estadoLoteAnterior: EstadoLoteCoordinador | null;
  reportadoPor: string;
  fechaReporte: string;
  resuelta: boolean;
  resolucion: string | null;
  resueltoPor: string | null;
  fechaResolucion: string | null;
}

export interface IncidenciaRequestDto {
  loteId: number;
  detalles: string;
}

export interface ResolverIncidenciaRequestDto {
  reactivarLote: boolean;
  resolucion: string;
}

export interface StrikeCoordinadorDto {
  id: number;
  organizacionId: number;
  organizacionNombre: string;
  asignacionId: number | null;
  nombreStrike: string;
  detalles: string | null;
  fechaRegistro: string;
  vigente: boolean;
  justificacionApelacion: string | null;
  fechaApelacion: string | null;
}

export interface EvaluarApelacionStrikeRequestDto {
  strikeId: number;
  justificacion: string;
  aprobada: boolean;
}

export interface ImpactoCategoriaCoordinadorDto {
  categoriaId: number;
  categoria: string;
  unidadMedida: string;
  lotes: number;
  cantidadPublicada: number;
  cantidadRecuperada: number;
}

export interface OrganizacionStrikesCoordinadorDto {
  organizacionId: number;
  nombre: string;
  strikesVigentes: number;
  bloqueada: boolean;
}

export interface ReporteImpactoCoordinadorDto {
  desde: string;
  hasta: string;
  categoriaId: number | null;
  totalLotesPublicados: number;
  cantidadTotalPublicada: number;
  cantidadTotalAsignada: number;
  cantidadTotalRecuperada: number;
  porcentajeRecuperacion: number;
  totalEntregas: number;
  entregasFueraDeFranja: number;
  solicitudesPorEstado: Record<EstadoSolicitud, number>;
  tiempoPromedioRespuestaMinutos: number | null;
  strikesRegistrados: number;
  organizacionesBloqueadas: number;
  porCategoria: ImpactoCategoriaCoordinadorDto[];
  organizacionesConStrikes: OrganizacionStrikesCoordinadorDto[];
}
