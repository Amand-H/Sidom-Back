import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SlicePipe } from '@angular/common';
import { AsignacionService } from '../../core/services/asignacion.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { AuthService } from '../../core/services/auth.service';
import { SolicitudDisponible } from '../../core/models/asignacion.model';

interface PedidoCard {
  disp: SolicitudDisponible;
  descripcion: string;
  dirRecogida: string;
  dirEntrega: string;
  servicio: string;
  zona: string;
  accepting: boolean;
}

@Component({
  selector: 'app-pedidos-disponibles',
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule, SlicePipe],
  templateUrl: './pedidos-disponibles.html',
  styleUrl: './pedidos-disponibles.css',
})
export class PedidosDisponiblesComponent implements OnInit {
  private asignSvc = inject(AsignacionService);
  private solSvc   = inject(SolicitudService);
  private tipoSvc  = inject(TipoMaestraService);
  private auth     = inject(AuthService);
  private snack    = inject(MatSnackBar);

  loading = signal(true);
  pedidos = signal<PedidoCard[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({
      disponibles: this.asignSvc.panelDisponibles(),
      solicitudes: this.solSvc.getAll(),
      tipos:       this.tipoSvc.getAll(),
    }).subscribe({
      next: ({ disponibles, solicitudes, tipos }) => {
        const solMap  = new Map(solicitudes.map(s => [s.id!, s]));
        const tipoMap = new Map(tipos.map(t => [t.id!, t]));

        this.pedidos.set(disponibles.map(d => {
          const sol = solMap.get(d.solicitud);
          return {
            disp:        d,
            descripcion: sol?.descripcionSolicitud ?? '',
            dirRecogida: sol?.direccionRecogidaSolicitud ?? '',
            dirEntrega:  sol?.direccionEntregaSolicitud  ?? '',
            servicio:    sol ? (tipoMap.get(sol.tipoServicio)?.nombreTipo ?? '') : '',
            zona:        sol ? (tipoMap.get(sol.tipoZona)?.nombreTipo ?? '') : '',
            accepting:   false,
          };
        }));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  aceptar(card: PedidoCard) {
    const entityId = this.auth.currentUser()?.entityId;
    if (!entityId) { this.snack.open('No se encontró tu ID de domiciliario', 'Cerrar', { duration: 4000 }); return; }

    card.accepting = true;
    this.asignSvc.aceptarDisponible(card.disp.id!, entityId).subscribe({
      next: () => {
        this.snack.open('¡Pedido aceptado! Aparece en tu sección "En Ruta".', 'OK', { duration: 4000, panelClass: 'snack-success' });
        this.load();
      },
      error: err => {
        card.accepting = false;
        this.snack.open(err?.error?.detail || 'Error al aceptar el pedido', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }

  svcIcon(s: string): string {
    const v = s.toLowerCase();
    if (v.includes('comida'))   return 'restaurant';
    if (v.includes('farmacia')) return 'local_pharmacy';
    if (v.includes('super'))    return 'shopping_cart';
    if (v.includes('mensaj'))   return 'mail';
    return 'store';
  }
}
