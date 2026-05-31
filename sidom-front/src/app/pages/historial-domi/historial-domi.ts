import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { EntregaService } from '../../core/services/entrega.service';
import { AsignacionService } from '../../core/services/asignacion.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { AuthService } from '../../core/services/auth.service';

interface HistorialRow {
  seguimientoId: number;
  asignacionId: number;
  dirEntrega: string;
  estadoActual: string;
  estadoNombre: string;
  cumplimiento: string;
  fechaEstimada: string;
  fechaReal: string;
}

@Component({
  selector: 'app-historial-domi',
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './historial-domi.html',
  styleUrl: './historial-domi.css',
})
export class HistorialDomiComponent implements OnInit {
  private entregaSvc = inject(EntregaService);
  private asignSvc   = inject(AsignacionService);
  private tipoSvc    = inject(TipoMaestraService);
  private auth       = inject(AuthService);

  loading      = signal(true);
  dataSource   = new MatTableDataSource<HistorialRow>([]);
  columns      = ['seguimientoId', 'dirEntrega', 'estado', 'cumplimiento', 'fechaEstimada', 'fechaReal'];

  @ViewChild(MatSort)      set sort(s: MatSort)      { this.dataSource.sort = s; }
  @ViewChild(MatPaginator) set pag(p: MatPaginator)  { this.dataSource.paginator = p; }

  ngOnInit() {
    const entityId = this.auth.currentUser()?.entityId;

    forkJoin({
      tiempoReal:   this.entregaSvc.tiempoReal(),
      seguimientos: this.entregaSvc.getAllSeguimientos(),
      tipos:        this.tipoSvc.getAll(),
    }).subscribe({
      next: ({ tiempoReal, seguimientos, tipos }) => {
        const tipoNombreMap = new Map(tipos.map(t => [t.codigoTipo ?? '', t.nombreTipo]));

        const misDatos = (tiempoReal as any[])
          .filter(r => !entityId || r.domiciliario === entityId);

        const rows: HistorialRow[] = misDatos.map(r => {
          const seg = seguimientos.find(s => s.id === r.seguimiento);
          return {
            seguimientoId: r.seguimiento,
            asignacionId:  r.asignacion,
            dirEntrega:    r.direccionEntrega ?? '',
            estadoActual:  r.estadoActual ?? '',
            estadoNombre:  tipoNombreMap.get(r.estadoActual) ?? r.estadoActual,
            cumplimiento:  r.cumplimiento ?? 'PENDIENTE',
            fechaEstimada: seg?.fechaEstimadaSeguimiento ?? '',
            fechaReal:     seg?.fechaRealSeguimiento ?? '',
          };
        });

        this.dataSource.data = rows;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filter(e: Event) {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  cumplimientoBadge(c: string): string {
    if (c === 'A_TIEMPO')    return 'badge success';
    if (c === 'CON_RETRASO') return 'badge danger';
    return 'badge neutral';
  }

  fmtFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }

  estadoBadge(c: string): string {
    if (c === 'ENTREGADO')   return 'badge success';
    if (c === 'EN_CAMINO')   return 'badge info';
    if (c === 'RECOGIDO')    return 'badge warning';
    if (c === 'CON_NOVEDAD') return 'badge danger';
    return 'badge neutral';
  }
}
