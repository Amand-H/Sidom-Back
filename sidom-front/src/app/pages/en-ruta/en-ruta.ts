import { Component, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import * as L from 'leaflet';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EntregaService } from '../../core/services/entrega.service';
import { TrackingService } from '../../core/services/tracking.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { AuthService } from '../../core/services/auth.service';
import { NovedadRapidaDialogComponent } from './novedad-rapida-dialog';
import { forkJoin } from 'rxjs';

export interface EntregaActiva {
  seguimientoId: number;
  asignacionId: number;
  descripcion: string;
  dirEntrega: string;
  estadoActual: string;
  estadoNombre: string;
  cumplimiento: string;
  lat: number | null;
  lng: number | null;
  hora: string | null;
}

const ESTADOS_ENTREGA = [
  { codigo: 'RECOGIDO',    label: 'Recogido',    icon: 'inventory_2',    color: '#6a1b9a' },
  { codigo: 'EN_CAMINO',   label: 'En camino',   icon: 'delivery_dining', color: '#0277bd' },
  { codigo: 'ENTREGADO',   label: 'Entregado',   icon: 'check_circle',   color: '#2e7d32' },
  { codigo: 'CON_NOVEDAD', label: 'Con novedad', icon: 'report_problem', color: '#e65100' },
];

@Component({
  selector: 'app-en-ruta',
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './en-ruta.html',
  styleUrl: './en-ruta.css',
})
export class EnRutaComponent implements OnInit, AfterViewInit, OnDestroy {
  private entregaSvc  = inject(EntregaService);
  private trackingSvc = inject(TrackingService);
  private tipoSvc     = inject(TipoMaestraService);
  private auth        = inject(AuthService);
  private dialog      = inject(MatDialog);
  private snack       = inject(MatSnackBar);

  @ViewChild('mapEl') mapEl!: ElementRef;

  loading       = signal(true);
  entregas      = signal<EntregaActiva[]>([]);
  selected      = signal<EntregaActiva | null>(null);
  gpsActivo     = signal(false);
  gpsLabel      = signal('Compartir ubicación');
  estadosMap    = new Map<string, number>();   // codigo → id TipoMaestra

  private map:     L.Map | null    = null;
  private markers: L.CircleMarker[] = [];
  private watchId: number | null   = null;
  private mapReady = false;
  private pendingData: EntregaActiva[] = [];

  readonly estadosFlow = ESTADOS_ENTREGA;

  ngOnInit()       { this.load(); }
  ngAfterViewInit(){ this.mapReady = true; if (this.pendingData.length) this.renderMap(this.pendingData); }

  ngOnDestroy() {
    this.stopGps();
    this.map?.remove();
    this.map = null;
  }

  load() {
    const entityId = this.auth.currentUser()?.entityId;
    this.loading.set(true);

    forkJoin({
      tiempoReal: this.entregaSvc.tiempoReal(),
      tipos:      this.tipoSvc.getAll(),
    }).subscribe({
      next: ({ tiempoReal, tipos }) => {
        tipos.forEach(t => { if (t.codigoTipo) this.estadosMap.set(t.codigoTipo, t.id!); });

        const tipoNombreMap = new Map(tipos.map(t => [t.codigoTipo ?? '', t.nombreTipo]));

        const activas: EntregaActiva[] = (tiempoReal as any[])
          .filter(r => !entityId || r.domiciliario === entityId)
          .filter(r => r.estadoActual !== 'ENTREGADO')
          .map(r => ({
            seguimientoId: r.seguimiento,
            asignacionId:  r.asignacion,
            descripcion:   r.direccionEntrega ?? 'Sin descripción',
            dirEntrega:    r.direccionEntrega ?? '',
            estadoActual:  r.estadoActual ?? '',
            estadoNombre:  tipoNombreMap.get(r.estadoActual) ?? r.estadoActual,
            cumplimiento:  r.cumplimiento ?? 'PENDIENTE',
            lat:           r.ultimaLatitud  ? parseFloat(r.ultimaLatitud)  : null,
            lng:           r.ultimaLongitud ? parseFloat(r.ultimaLongitud) : null,
            hora:          r.ultimaFechaHora ?? null,
          }));

        this.entregas.set(activas);
        this.selected.set(activas[0] ?? null);
        this.loading.set(false);

        if (this.mapReady) this.renderMap(activas);
        else this.pendingData = activas;
      },
      error: () => this.loading.set(false),
    });
  }

  selectEntrega(e: EntregaActiva) {
    this.selected.set(e);
    if (e.lat && e.lng && this.map) this.map.setView([e.lat, e.lng], 15);
  }

  cambiarEstado(entrega: EntregaActiva, codigo: string) {
    const tipoId = this.estadosMap.get(codigo);
    if (!tipoId) { this.snack.open('Estado no encontrado', 'Cerrar', { duration: 3000 }); return; }

    this.entregaSvc.cambiarEstado(entrega.seguimientoId, tipoId).subscribe({
      next: () => {
        this.snack.open(`Estado actualizado: ${codigo}`, 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.load();
      },
      error: err => this.snack.open(err?.error?.detail || 'Error al actualizar estado', 'Cerrar', { duration: 4000, panelClass: 'snack-error' }),
    });
  }

  abrirNovedad(entrega: EntregaActiva) {
    this.dialog.open(NovedadRapidaDialogComponent, {
      data: { seguimientoId: entrega.seguimientoId },
      width: '480px',
    }).afterClosed().subscribe(ok => { if (ok) this.load(); });
  }

  toggleGps() {
    if (this.gpsActivo()) { this.stopGps(); return; }

    const asignacionId = this.selected()?.asignacionId;
    if (!asignacionId) { this.snack.open('Selecciona una entrega activa primero', 'Cerrar', { duration: 3000 }); return; }

    if (!navigator.geolocation) {
      this.snack.open('Tu dispositivo no soporta GPS', 'Cerrar', { duration: 3000 });
      return;
    }

    this.gpsActivo.set(true);
    this.gpsLabel.set('Compartiendo GPS...');

    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.trackingSvc.post({
          latitudUbicacion: latitude as any,
          longitudUbicacion: longitude as any,
          asignacion: asignacionId,
        }).subscribe();

        if (this.map) {
          this.map.setView([latitude, longitude], 15);
          this.markers.forEach(m => this.map!.removeLayer(m));
          this.markers = [];
          const m = L.circleMarker([latitude, longitude], {
            radius: 12, fillColor: '#4caf50', color: '#fff', weight: 3, fillOpacity: 0.95,
          }).addTo(this.map!).bindPopup('📍 Mi posición actual');
          this.markers.push(m);
        }
      },
      () => {
        this.snack.open('No se pudo obtener tu ubicación GPS', 'Cerrar', { duration: 3000 });
        this.stopGps();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }

  private stopGps() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.gpsActivo.set(false);
    this.gpsLabel.set('Compartir ubicación');
  }

  isNextStep(entrega: EntregaActiva, codigo: string): boolean {
    const order = ['RECOGIDO', 'EN_CAMINO', 'ENTREGADO'];
    const cur = order.indexOf(entrega.estadoActual);
    const next = order.indexOf(codigo);
    return next === cur + 1;
  }

  private renderMap(entregas: EntregaActiva[]) {
    if (!this.mapEl?.nativeElement) return;
    if (!this.map) {
      this.map = L.map(this.mapEl.nativeElement).setView([10.4, -75.5], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);
    } else {
      this.map.eachLayer(l => { if (!(l instanceof L.TileLayer)) this.map!.removeLayer(l); });
    }
    const puntos: L.LatLngTuple[] = [];
    entregas.forEach(e => {
      if (!e.lat || !e.lng) return;
      const m = L.circleMarker([e.lat, e.lng], {
        radius: 12, fillColor: '#1565c0', color: '#fff', weight: 3, fillOpacity: 0.9,
      }).addTo(this.map!)
        .bindPopup(`<strong>📦 ${e.dirEntrega}</strong><br><small>${e.estadoNombre}</small>`);
      this.markers.push(m);
      puntos.push([e.lat, e.lng]);
    });
    if (puntos.length === 1) this.map!.setView(puntos[0], 14);
    else if (puntos.length > 1) this.map!.fitBounds(L.latLngBounds(puntos), { padding: [50, 50] });
  }

  estadoBadge(c: string): string {
    if (c === 'ENTREGADO')   return 'badge success';
    if (c === 'EN_CAMINO')   return 'badge info';
    if (c === 'RECOGIDO')    return 'badge warning';
    if (c === 'CON_NOVEDAD') return 'badge danger';
    return 'badge neutral';
  }

  formatHora(h: string | null) {
    if (!h) return 'Sin GPS';
    return new Date(h).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
}
