import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmergenciaRequest {
  asignacion_id: number;
  domiciliario_id: number;
  tipo: string;
  descripcion: string;
  latitud: number | null;
  longitud: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class EmergenciaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/emergencias';

  registrarEmergencia(data: EmergenciaRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/registrar/`, data);
  }

  listarEmergencias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/listar/`);
  }
}