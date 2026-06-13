import { Component, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as L from 'leaflet';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/services/auth.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { AsignacionService } from '../../core/services/asignacion.service';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { TrackingService } from '../../core/services/tracking.service';
import { EntregaService } from '../../core/services/entrega.service';
import { Solicitud } from '../../core/models/solicitud.model';
import { Domiciliario } from '../../core/models/domiciliario.model';
import { PedidoDialogComponent } from './pedido-dialog';

export interface CompensacionInfo {
  valor: number;
  valorFormatted: string;
  fecha: string;
  estadoNombre: string;
}

export interface DomicilioCard {
  solicitud: Solicitud;
  domiciliario: Domiciliario | null;
  estadoCodigo: string;
  estadoNombre: string;
  fechaAsignacion: string;
  ultimaUbicacion: { lat: number; lng: number; hora: string } | null;
  tipoServicioNombre: string;
  tipoZonaNombre: string;
  asignacionId: number | null;
  seguimientoId: number | null;
  compensacion: CompensacionInfo | null;
}

const TIMELINE: { codigo: string; label: string; icon: string }[] = [
  { codigo: 'PENDIENTE',  label: 'Pendiente',  icon: 'hourglass_empty' },
  { codigo: 'VALIDADA',   label: 'Validada',   icon: 'verified'        },
  { codigo: 'EN_PROCESO', label: 'En camino',  icon: 'delivery_dining' },
  { codigo: 'ENTREGADA',  label: 'Entregado',  icon: 'check_circle'    },
  { codigo: 'CON_NOVEDAD', label: 'Incidencia', icon: 'warning' },
];

@Component({
  selector: 'app-mis-domicilios',
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule],
  templateUrl: './mis-domicilios.html',
  styleUrl: './mis-domicilios.css',
})
export class MisDomiciliosComponent implements OnInit, AfterViewInit, OnDestroy {
  private auth         = inject(AuthService);
  private solicitudSvc = inject(SolicitudService);
  private asignSvc     = inject(AsignacionService);
  private domSvc       = inject(DomiciliarioService);
  private tipoSvc      = inject(TipoMaestraService);
  private trackingSvc  = inject(TrackingService);
  private entregaSvc   = inject(EntregaService);
  private dialog       = inject(MatDialog);

  @ViewChild('mapEl') mapEl!: ElementRef;

  loading      = signal(true);
  gpsUpdating  = signal(false);
  ultimaActual = signal('');
  cards        = signal<DomicilioCard[]>([]);
  selected     = signal<DomicilioCard | null>(null);
  timeline     = TIMELINE;

  private map: L.Map | null = null;
  private mapReady  = false;
  private pollTimer: any = null;

  // Lookup tables reutilizados en el poll de GPS
  private asignIdBySolId = new Map<number, number>();   // solicitudId → asignacionId
  private myAsignIds     = new Set<number>();

  ngOnInit()       { this.load(); }
  ngAfterViewInit(){ this.mapReady = true; }

  ngOnDestroy() {
    clearInterval(this.pollTimer);
    this.map?.remove();
    this.map = null;
  }

  // ── Carga inicial completa ─────────────────────────────────────────────────
  load() {
    clearInterval(this.pollTimer);
    const entityId = this.auth.currentUser()?.entityId;
    this.loading.set(true);

    forkJoin({
      solicitudes:   this.solicitudSvc.getAll(),
      disponibles:   this.asignSvc.getAllDisponibles(),
      asignaciones:  this.asignSvc.getAllAsignaciones(),
      domiciliarios: this.domSvc.getAll(),
      tipos:         this.tipoSvc.getAll(),
      ubicaciones:   this.trackingSvc.getAll(),
      seguimientos:  this.entregaSvc.getAllSeguimientos(),
    }).subscribe({
      next: ({ solicitudes, disponibles, asignaciones, domiciliarios, tipos, ubicaciones, seguimientos }) => {
        const tiposMap  = new Map(tipos.map(t => [t.id!, t]));
        const codigoMap = new Map(tipos.map(t => [t.id!, t.codigoTipo ?? '']));
        const domMap    = new Map(domiciliarios.map(d => [d.id!, d]));
        const seguMap   = new Map(seguimientos.map(s => [s.asignacion, s]));

        // Solo pedidos activos (excluye finalizados que van al historial)
        const FINALES = new Set(['ENTREGADA', 'RECHAZADA']);
        const misSolicitudes = (this.auth.isAdmin() ? solicitudes : solicitudes.filter(s => s.cliente === entityId))
          .filter(s => !FINALES.has(codigoMap.get(s.tipoEstado ?? 0) ?? ''));

        const misSolicitudIds = new Set(misSolicitudes.map(s => s.id!));
        const misDisponibles  = disponibles.filter(d => misSolicitudIds.has(d.solicitud));
        const misDispIds      = new Set(misDisponibles.map(d => d.id!));
        const misAsignaciones = asignaciones.filter(a => misDispIds.has(a.solicitudDisponible));

        // Guardar lookup para el poll de GPS
        this.asignIdBySolId.clear();
        this.myAsignIds.clear();
        misAsignaciones.forEach(a => {
          const disp = misDisponibles.find(d => d.id === a.solicitudDisponible);
          if (disp) {
            this.asignIdBySolId.set(disp.solicitud, a.id!);
            this.myAsignIds.add(a.id!);
          }
        });

        const ultimaUbicMap = this.buildUbicMap(ubicaciones);

        const built: DomicilioCard[] = misSolicitudes.map(sol => {
          const disp   = misDisponibles.find(d => d.solicitud === sol.id);
          const asig   = disp ? misAsignaciones.find(a => a.solicitudDisponible === disp.id) : null;
          const dom    = disp?.domiciliario ? (domMap.get(disp.domiciliario) ?? null) : null;
          const uloc   = asig ? (ultimaUbicMap.get(asig.id!) ?? null) : null;
          const segu   = asig ? (seguMap.get(asig.id!) ?? null) : null;
          const estadoCodigo = codigoMap.get(sol.tipoEstado ?? 0) ?? '';
          const estadoNombre = tiposMap.get(sol.tipoEstado ?? 0)?.nombreTipo ?? 'Sin estado';

          let compensacion: CompensacionInfo | null = null;
          if (segu && Number(segu.compValor) > 0) {
            const valor = Number(segu.compValor);
            compensacion = {
              valor,
              valorFormatted: valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }),
              fecha: segu.compFecha ?? '',
              estadoNombre: segu.tipoEstadoComp ? (tiposMap.get(segu.tipoEstadoComp)?.nombreTipo ?? 'Pendiente') : 'Pendiente',
            };
          }

          return {
            solicitud:          sol,
            domiciliario:       dom,
            estadoCodigo,
            estadoNombre,
            fechaAsignacion:    asig?.fechaAsignacion ?? '',
            ultimaUbicacion:    uloc,
            tipoServicioNombre: tiposMap.get(sol.tipoServicio)?.nombreTipo ?? '',
            tipoZonaNombre:     tiposMap.get(sol.tipoZona)?.nombreTipo ?? '',
            asignacionId:       asig?.id ?? null,
            seguimientoId:      segu?.id ?? null,
            compensacion,
          };
        });

        const firstSelected = built.find(c => c.ultimaUbicacion) ?? built[0] ?? null;
        this.cards.set(built);
        this.selected.set(firstSelected);
        this.loading.set(false);
        this.ultimaActual.set(this.nowStr());

        if (this.mapReady) this.renderMapForCard(firstSelected);

        // Inicia polling ligero de GPS cada 10 s
        this.pollTimer = setInterval(() => this.refreshGps(), 10_000);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Poll: reconstruye asignaciones + GPS para capturar nuevas asignaciones ──
  private refreshGps() {
    this.gpsUpdating.set(true);

    // Incluimos disponibles y asignaciones para que si el domiciliario
    // aceptó el pedido DESPUÉS de que el cliente abrió la página,
    // myAsignIds se actualice con la nueva asignación.
    forkJoin({
      disponibles:  this.asignSvc.getAllDisponibles(),
      asignaciones: this.asignSvc.getAllAsignaciones(),
      ubicaciones:  this.trackingSvc.getAll(),
    }).subscribe({
      next: ({ disponibles, asignaciones, ubicaciones }) => {
        // Reconstruir lookup de asignaciones con datos frescos
        const solIds = new Set(this.cards().map(c => c.solicitud.id!));
        const misDisponibles  = disponibles.filter(d => solIds.has(d.solicitud));
        const misDispIds      = new Set(misDisponibles.map(d => d.id!));
        const misAsignaciones = asignaciones.filter(a => misDispIds.has(a.solicitudDisponible));

        this.myAsignIds.clear();
        this.asignIdBySolId.clear();
        misAsignaciones.forEach(a => {
          const disp = misDisponibles.find(d => d.id === a.solicitudDisponible);
          if (disp) {
            this.asignIdBySolId.set(disp.solicitud, a.id!);
            this.myAsignIds.add(a.id!);
          }
        });

        const ultimaUbicMap = this.buildUbicMap(ubicaciones);

        const updated = this.cards().map(card => {
          const asigId = this.asignIdBySolId.get(card.solicitud.id!) ?? null;
          const uloc   = asigId ? (ultimaUbicMap.get(asigId) ?? null) : null;
          return { ...card, ultimaUbicacion: uloc, asignacionId: asigId };
        });

        this.cards.set(updated);
        this.ultimaActual.set(this.nowStr());

        const sel = this.selected();
        if (sel) {
          const fresh = updated.find(c => c.solicitud.id === sel.solicitud.id) ?? null;
          this.selected.set(fresh);
          this.renderMapForCard(fresh);
        }

        this.gpsUpdating.set(false);
      },
      error: () => this.gpsUpdating.set(false),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private buildUbicMap(ubicaciones: any[]): Map<number, { lat: number; lng: number; hora: string }> {
    const map = new Map<number, { lat: number; lng: number; hora: string }>();
    [...ubicaciones]
      .filter(u => this.myAsignIds.has(Number(u.asignacion)))
      .sort((a, b) => (a.fechaHoraUbicacion ?? '').localeCompare(b.fechaHoraUbicacion ?? ''))
      .forEach(u => map.set(Number(u.asignacion), {
        lat:  parseFloat(u.latitudUbicacion),
        lng:  parseFloat(u.longitudUbicacion),
        hora: u.fechaHoraUbicacion ?? '',
      }));
    return map;
  }

  private nowStr() {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  selectCard(card: DomicilioCard) {
    this.selected.set(card);
    this.renderMapForCard(card);
  }

  openPedido() {
    this.dialog.open(PedidoDialogComponent, { width: '560px', disableClose: true })
      .afterClosed().subscribe(ok => { if (ok) this.load(); });
  }

  timelineStep(card: DomicilioCard, codigo: string): 'done' | 'active' | 'pending' {
    const order = ['PENDIENTE', 'VALIDADA', 'EN_PROCESO', 'ENTREGADA', 'CON_NOVEDAD'];
    const cardIdx = order.indexOf(card.estadoCodigo);
    const stepIdx = order.indexOf(codigo);
    if (card.estadoCodigo === 'RECHAZADA') return stepIdx === 0 ? 'active' : 'pending';
    if (stepIdx < cardIdx)  return 'done';
    if (stepIdx === cardIdx) return 'active';
    return 'pending';
  }

  isRechazada(card: DomicilioCard) { return card.estadoCodigo === 'RECHAZADA'; }

  formatHora(iso: string): string {
    if (!iso) return 'N/D';
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  serviceIcon(servicio: string): string {
    const s = servicio.toLowerCase();
    if (s.includes('comida'))   return 'restaurant';
    if (s.includes('farmacia')) return 'local_pharmacy';
    if (s.includes('super'))    return 'shopping_cart';
    if (s.includes('mensaj'))   return 'mail';
    return 'store';
  }

  badgeClass(codigo: string): string {
    if (codigo === 'ENTREGADA')  return 'badge success';
    if (codigo === 'CON_NOVEDAD') return 'badge danger';
    if (codigo === 'EN_PROCESO') return 'badge info';
    if (codigo === 'VALIDADA')   return 'badge warning';
    if (codigo === 'RECHAZADA')  return 'badge danger';
    return 'badge neutral';
  }

  private renderMapForCard(card: DomicilioCard | null) {
    if (!this.mapEl?.nativeElement) return;

    // Inicializar mapa si no existe
    if (!this.map) {
      this.map = L.map(this.mapEl.nativeElement).setView([10.4, -75.5], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);
    }

    // Limpiar marcadores anteriores (mantener solo el tile layer)
    this.map.eachLayer(l => { if (!(l instanceof L.TileLayer)) this.map!.removeLayer(l); });

    if (!card?.ultimaUbicacion) return;  // sin GPS: mapa vacío

    const { lat, lng, hora } = card.ultimaUbicacion;
    const nombre = card.domiciliario
      ? `${card.domiciliario.nombresDomiciliario} ${card.domiciliario.apellidosDomiciliario}`
      : 'Domiciliario';
    const vehic  = card.domiciliario?.tipoVehiculoDomiciliario ?? '';
    const placa  = card.domiciliario?.placaDomiciliario ?? '';
    const tel    = card.domiciliario?.telefonoDomiciliario ?? '';

    // Marcador del domiciliario
    L.circleMarker([lat, lng], {
      radius: 14, fillColor: '#1565c0', color: '#fff', weight: 3, fillOpacity: 0.95,
    }).addTo(this.map).bindPopup(`
      <div style="min-width:200px;font-family:sans-serif">
        <strong style="font-size:14px">🛵 ${nombre}</strong><br>
        <small style="color:#546e7a">${vehic} · ${placa}</small><br>
        <small style="color:#546e7a">📞 ${tel}</small>
        <hr style="margin:6px 0;border-color:#eee">
        <small>📦 ${card.solicitud.descripcionSolicitud.substring(0, 50)}</small><br>
        <small>📍 Destino: <strong>${card.solicitud.direccionEntregaSolicitud}</strong></small><br>
        <small style="color:#90a4ae">🕐 ${hora ? new Date(hora).toLocaleString('es-CO') : 'N/D'}</small>
      </div>
    `).openPopup();

    this.map.setView([lat, lng], 15);
  }
}