import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthUser, ADMIN_CREDENTIALS, UserRole } from '../models/auth.model';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'sidom_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  currentUser = signal<AuthUser | null>(this.loadFromStorage());

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const user = raw ? JSON.parse(raw) as AuthUser : null;
      if (user && user.role !== 'ADMIN' && !user.entityId) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return user;
    } catch { return null; }
  }

  private saveToStorage(user: AuthUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  isLoggedIn(): boolean { return this.currentUser() !== null; }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : false;
  }

  isAdmin():        boolean { return this.hasRole('ADMIN'); }
  isCliente():      boolean { return this.hasRole('CLIENTE'); }
  isDomiciliario(): boolean { return this.hasRole('DOMICILIARIO'); }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
  }

  login(username: string, password: string): Observable<AuthUser> {
    // Admin hardcoded — no backend call needed
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      const user: AuthUser = { id: 0, name: 'Administrador', username, role: 'ADMIN', entityId: null };
      this.saveToStorage(user);
      this.currentUser.set(user);
      return of(user);
    }

    // All other users go through the backend login endpoint
    return this.http.post<any>(`${this.base}/usuarios/login/`, { username, password }).pipe(
      map(res => {
        const role = (res.role as string).toUpperCase() as UserRole;
        const user: AuthUser = {
          id: res.id,
          name: res.name,
          username: res.username,
          role,
          entityId: res.entityId ?? null,
        };
        this.saveToStorage(user);
        this.currentUser.set(user);
        return user;
      }),
      catchError(err => {
        const msg = err?.error?.error || 'Usuario o contraseña incorrectos';
        throw msg;
      })
    );
  }

  cambiarPassword(passwordActual: string, passwordNuevo: string): Observable<void> {
    const usuarioId = this.currentUser()?.id;
    return this.http.post<void>(`${this.base}/usuarios/cambiar-password/`, {
      usuarioId, passwordActual, passwordNuevo,
    });
  }

  register(payload: Record<string, any>): Observable<AuthUser> {
    return this.http.post<any>(`${this.base}/usuarios/registro/`, payload).pipe(
      map(res => {
        const role = (res.role as string).toUpperCase() as UserRole;
        const user: AuthUser = {
          id: res.id,
          name: res.name,
          username: res.username,
          role,
          entityId: res.entityId ?? null,
        };
        this.saveToStorage(user);
        this.currentUser.set(user);
        return user;
      }),
      catchError(err => {
        // Flatten DRF validation errors to a single string
        const data = err?.error;
        if (typeof data === 'object' && data !== null) {
          const msgs = Object.values(data).flat().join(' | ');
          throw msgs || 'Error en el registro';
        }
        throw 'Error en el registro';
      })
    );
  }
}
