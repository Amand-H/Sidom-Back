import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Asignacion, SolicitudDisponible } from '../models/asignacion.model';

@Injectable({ providedIn: 'root' })
export class AsignacionService extends ApiService {
  getAllDisponibles(): Observable<SolicitudDisponible[]>    { return this.getList<SolicitudDisponible>('asignaciones/solicitudes-disponibles'); }
  postDisponible(d: SolicitudDisponible): Observable<SolicitudDisponible> { return this.create<SolicitudDisponible>('asignaciones/solicitudes-disponibles', d); }
  putDisponible(id: number, d: SolicitudDisponible): Observable<SolicitudDisponible> { return this.update<SolicitudDisponible>('asignaciones/solicitudes-disponibles', id, d); }
  delDisponible(id: number): Observable<void>              { return this.remove('asignaciones/solicitudes-disponibles', id); }
  publicarSolicitud(solicitud: number): Observable<SolicitudDisponible> {
    return this.http.post<SolicitudDisponible>(`${this.baseUrl}/asignaciones/solicitudes-disponibles/publicar/`, { solicitud });
  }
  aceptarDisponible(id: number, domiciliario: number): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${this.baseUrl}/asignaciones/solicitudes-disponibles/${id}/aceptar/`, { domiciliario });
  }
  panelDisponibles(): Observable<SolicitudDisponible[]> {
    return this.http.get<SolicitudDisponible[]>(`${this.baseUrl}/asignaciones/solicitudes-disponibles/panel/`);
  }

  getAllAsignaciones(): Observable<Asignacion[]>           { return this.getList<Asignacion>('asignaciones/asignaciones'); }
  postAsignacion(d: Asignacion): Observable<Asignacion>   { return this.create<Asignacion>('asignaciones/asignaciones', d); }
  putAsignacion(id: number, d: Asignacion): Observable<Asignacion> { return this.update<Asignacion>('asignaciones/asignaciones', id, d); }
  delAsignacion(id: number): Observable<void>             { return this.remove('asignaciones/asignaciones', id); }
  gpsActivo(): Observable<any[]>                          { return this.http.get<any[]>(`${this.baseUrl}/asignaciones/asignaciones/gps-activo/`); }
  cargaDomiciliario(id: number): Observable<any>          { return this.http.get<any>(`${this.baseUrl}/asignaciones/asignaciones/carga-domiciliario/?domiciliario=${id}`); }
}
