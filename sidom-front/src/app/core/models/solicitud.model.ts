export interface Solicitud {
  id?: number;
  fechaSolicitud?: string;
  descripcionSolicitud: string;
  direccionRecogidaSolicitud?: string | null;
  direccionEntregaSolicitud: string;
  cliente: number;
  tipoZona: number;
  tipoServicio: number;
  tipoEstado?: number | null;
  tipoMotivoRechazo?: number | null;
  tipoModalidad?: number | null;
  tipoProioridad?: number | null;
  tipoEstadoCodigo?: string;
  tipoMotivoRechazoCodigo?: string | null;
}

export interface Cotizacion {
  capacidad: 'ALTA' | 'LIMITADA' | 'SIN_COBERTURA';
  domi_totales: number;
  domi_disponibles: number;
  tiempo_estimado: number;
  tiempo_si_espera: number;
}
