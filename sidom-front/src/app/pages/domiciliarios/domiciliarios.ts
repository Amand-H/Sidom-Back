import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { Domiciliario } from '../../core/models/domiciliario.model';
import { DomiciliarioDialogComponent } from './domiciliario-dialog';

@Component({
  selector: 'app-domiciliarios',
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './domiciliarios.html',
})
export class DomiciliariosComponent implements OnInit {
  private service = inject(DomiciliarioService);
  private dialog  = inject(MatDialog);
  private snack   = inject(MatSnackBar);

  loading    = signal(true);
  dataSource = new MatTableDataSource<Domiciliario>([]);
  displayedColumns = ['identificacion', 'nombre', 'telefono', 'vehiculo', 'placa', 'puntaje', 'acciones'];

  @ViewChild(MatSort)    set sort(s: MatSort)       { this.dataSource.sort = s; }
  @ViewChild(MatPaginator) set pag(p: MatPaginator) { this.dataSource.paginator = p; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => { this.dataSource.data = data; this.loading.set(false); },
      error: () => { this.snack.open('Error al cargar domiciliarios', 'Cerrar', { duration: 3000, panelClass: 'snack-error' }); this.loading.set(false); }
    });
  }

  filter(e: Event) { this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase(); }

  openDialog(item?: Domiciliario) {
    this.dialog.open(DomiciliarioDialogComponent, { data: item ?? null, width: '600px' })
      .afterClosed().subscribe(r => { if (r) this.load(); });
  }

  puntajeClass(p: number | undefined): string {
    const v = p ?? 100;
    if (v >= 80) return 'success';
    if (v >= 50) return 'warning';
    return 'danger';
  }

  delete(id: number) {
    if (!confirm('¿Eliminar este domiciliario?')) return;
    this.service.del(id).subscribe({
      next: () => { this.snack.open('Domiciliario eliminado', 'OK', { duration: 3000, panelClass: 'snack-success' }); this.load(); },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000, panelClass: 'snack-error' })
    });
  }
}
