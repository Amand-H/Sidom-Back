import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { AsignacionService } from '../../core/services/asignacion.service';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { Solicitud } from '../../core/models/solicitud.model';
import { Domiciliario } from '../../core/models/domiciliario.model';

interface HistorialCard {
  solicitud: Solicitud;
  estadoCodigo: string;
  estadoNombre: string;
  domiciliario: Domiciliario | null;
  fechaAsignacion: string;
  tipoServicioNombre: string;
}

const ESTADOS_FINALES = new Set(['ENTREGADA', 'RECHAZADA']);

@Component({
  selector: 'app-historial-cliente',
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: './historial-cliente.html',
  styleUrl: './historial-cliente.css',
})
export class HistorialClienteComponent implements OnInit {
  private auth         = inject(AuthService);
  private solicitudSvc = inject(SolicitudService);
  private asignSvc     = inject(AsignacionService);
  private domSvc       = inject(DomiciliarioService);
  private tipoSvc      = inject(TipoMaestraService);

  loading = signal(true);
  cards   = signal<HistorialCard[]>([]);

  ngOnInit() {
    const entityId = this.auth.currentUser()?.entityId;

    forkJoin({
      solicitudes:   this.solicitudSvc.getAll(),
      disponibles:   this.asignSvc.getAllDisponibles(),
      asignaciones:  this.asignSvc.getAllAsignaciones(),
      domiciliarios: this.domSvc.getAll(),
      tipos:         this.tipoSvc.getAll(),
    }).subscribe({
      next: ({ solicitudes, disponibles, asignaciones, domiciliarios, tipos }) => {
        const codigoMap = new Map(tipos.map(t => [t.id!, t.codigoTipo ?? '']));
        const nombreMap = new Map(tipos.map(t => [t.id!, t.nombreTipo]));
        const domMap    = new Map(domiciliarios.map(d => [d.id!, d]));

        const misSolicitudes = (this.auth.isAdmin() ? solicitudes : solicitudes.filter(s => s.cliente === entityId))
          .filter(s => {
            const cod = codigoMap.get(s.tipoEstado ?? 0) ?? '';
            return ESTADOS_FINALES.has(cod);
          });

        const misDispIds = new Set(disponibles.filter(d => misSolicitudes.some(s => s.id === d.solicitud)).map(d => d.id!));

        const built: HistorialCard[] = misSolicitudes.map(sol => {
          const disp  = disponibles.find(d => d.solicitud === sol.id);
          const asig  = disp ? asignaciones.find(a => a.solicitudDisponible === disp.id) : null;
          const dom   = disp?.domiciliario ? domMap.get(disp.domiciliario) ?? null : null;
          const estadoCodigo = codigoMap.get(sol.tipoEstado ?? 0) ?? '';

          return {
            solicitud:          sol,
            estadoCodigo,
            estadoNombre:       nombreMap.get(sol.tipoEstado ?? 0) ?? 'Sin estado',
            domiciliario:       dom,
            fechaAsignacion:    asig?.fechaAsignacion ?? '',
            tipoServicioNombre: nombreMap.get(sol.tipoServicio) ?? '',
          };
        });

        this.cards.set(built);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  serviceIcon(s: string): string {
    const v = s.toLowerCase();
    if (v.includes('comida'))   return 'restaurant';
    if (v.includes('farmacia')) return 'local_pharmacy';
    if (v.includes('super'))    return 'shopping_cart';
    if (v.includes('mensaj'))   return 'mail';
    return 'store';
  }
}
