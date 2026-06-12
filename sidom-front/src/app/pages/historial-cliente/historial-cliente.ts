import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { AsignacionService } from '../../core/services/asignacion.service';
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

@Component({
  selector: 'app-historial-cliente',
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: './historial-cliente.html',
  styleUrl: './historial-cliente.css',
})
export class HistorialClienteComponent implements OnInit {
  private auth     = inject(AuthService);
  private asignSvc = inject(AsignacionService);

  loading = signal(true);
  cards   = signal<HistorialCard[]>([]);

  ngOnInit() {
    const user = this.auth.currentUser();
    const rawClienteId = user?.role === 'CLIENTE' ? user.entityId : undefined;
    const clienteId: number | undefined = rawClienteId != null ? rawClienteId : undefined;

    this.asignSvc.historialCliente(clienteId).subscribe({
      next: (data) => {
        const cards: HistorialCard[] = data.map(r => ({
          solicitud: {
            id:                        r.solicitudId,
            descripcionSolicitud:      r.descripcion,
            direccionEntregaSolicitud: r.dirEntrega,
            fechaSolicitud:            r.fechaSolicitud,
            cliente:                   r.clienteId,
            tipoZona:                  0,
            tipoServicio:              0,
          } as Solicitud,
          estadoCodigo:      r.estadoCodigo,
          estadoNombre:      r.estadoNombre,
          tipoServicioNombre: r.tipoServicioNombre,
          fechaAsignacion:   r.fechaAsignacion ?? '',
          domiciliario: r.domiciliarioId ? {
            id:                       r.domiciliarioId,
            nombresDomiciliario:      r.domiciliarioNombres,
            apellidosDomiciliario:    r.domiciliarioApellidos,
            placaDomiciliario:        r.domiciliarioPlaca,
            telefonoDomiciliario:     '',
            identificacionDomiciliario: '',
            tipoVehiculoDomiciliario: '',
            puntajeDomiciliario:      0,
          } as Domiciliario : null,
        }));
        this.cards.set(cards);
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
