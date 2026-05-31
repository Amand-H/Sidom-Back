import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  protected http = inject(HttpClient);
  protected baseUrl = environment.apiUrl;

  protected getList<T>(path: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/${path}/`);
  }

  protected getOne<T>(path: string, id: number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}/${id}/`);
  }

  protected create<T>(path: string, body: T): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}/`, body);
  }

  protected update<T>(path: string, id: number, body: T): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${path}/${id}/`, body);
  }

  protected partialUpdate<T>(path: string, id: number, body: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${path}/${id}/`, body);
  }

  protected remove(path: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${path}/${id}/`);
  }
}
