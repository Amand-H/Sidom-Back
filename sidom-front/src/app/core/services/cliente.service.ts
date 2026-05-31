import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Cliente } from '../models/cliente.model';

const PATH = 'usuarios/clientes';

@Injectable({ providedIn: 'root' })
export class ClienteService extends ApiService {
  getAll(): Observable<Cliente[]>                          { return this.getList<Cliente>(PATH); }
  getById(id: number): Observable<Cliente>                 { return this.getOne<Cliente>(PATH, id); }
  post(d: Cliente): Observable<Cliente>                    { return this.create<Cliente>(PATH, d); }
  put(id: number, d: Cliente): Observable<Cliente>         { return this.update<Cliente>(PATH, id, d); }
  patch(id: number, d: Partial<Cliente>): Observable<Cliente> { return this.partialUpdate<Cliente>(PATH, id, d); }
  del(id: number): Observable<void>                        { return this.remove(PATH, id); }
}
