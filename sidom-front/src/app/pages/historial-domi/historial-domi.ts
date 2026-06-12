import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AsignacionService } from '../../core/services/asignacion.service';
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
  private asignSvc = inject(AsignacionService);
  private auth     = inject(AuthService);

  loading    = signal(true);
  dataSource = new MatTableDataSource<HistorialRow>([]);
  columns    = ['seguimientoId', 'dirEntrega', 'estado', 'cumplimiento', 'fechaEstimada', 'fechaReal'];

  @ViewChild(MatSort)      set sort(s: MatSort)      { this.dataSource.sort = s; }
  @ViewChild(MatPaginator) set pag(p: MatPaginator)  { this.dataSource.paginator = p; }

  ngOnInit() {
    const user = this.auth.currentUser();
    const rawDomiId = user?.role === 'DOMICILIARIO' ? user.entityId : undefined;
    const domiId: number | undefined = rawDomiId != null ? rawDomiId : undefined;

    this.asignSvc.historialDomi(domiId).subscribe({
      next: (data) => {
        this.dataSource.data = data as HistorialRow[];
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
