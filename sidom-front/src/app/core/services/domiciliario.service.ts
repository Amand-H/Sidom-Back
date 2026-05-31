import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Domiciliario } from '../models/domiciliario.model';

const PATH = 'usuarios/domiciliarios';

@Injectable({ providedIn: 'root' })
export class DomiciliarioService extends ApiService {
  getAll(): Observable<Domiciliario[]>                               { return this.getList<Domiciliario>(PATH); }
  getById(id: number): Observable<Domiciliario>                      { return this.getOne<Domiciliario>(PATH, id); }
  post(d: Domiciliario): Observable<Domiciliario>                    { return this.create<Domiciliario>(PATH, d); }
  put(id: number, d: Domiciliario): Observable<Domiciliario>         { return this.update<Domiciliario>(PATH, id, d); }
  patch(id: number, d: Partial<Domiciliario>): Observable<Domiciliario> { return this.partialUpdate<Domiciliario>(PATH, id, d); }
  del(id: number): Observable<void>                                  { return this.remove(PATH, id); }
}
