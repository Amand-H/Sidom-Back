import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { EntregaService } from '../../core/services/entrega.service';
import { ResolverDialogComponent } from './resolver-dialog';

@Component({
  selector: 'app-novedades-sin-resolver',
  standalone: true,
  imports: [
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
    MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="nsr-header">
      <div>
        <h2>Novedades sin Resolver</h2>
        <p>Incidentes pendientes de atención por zona</p>
      </div>
      <button mat-icon-button (click)="load()" title="Actualizar"><mat-icon>refresh</mat-icon></button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="48" /></div>
    } @else if (novedades().length === 0) {
      <div class="empty">
        <mat-icon>check_circle</mat-icon>
        <p>No hay novedades pendientes. ¡Todo bajo control!</p>
      </div>
    } @else {
      <div class="nsr-grid">
        @for (n of novedades(); track n.NOVE_ID ?? n.id) {
          <div class="nsr-card" [class]="prioridadCardClass(n.PRIORIDAD ?? n.prioridad)">

            <div class="nsr-top">
              <span class="prio-badge" [class]="prioridadClass(n.PRIORIDAD ?? n.prioridad)">
                <mat-icon style="font-size:13px;vertical-align:middle">
                  {{ prioridadIcon(n.PRIORIDAD ?? n.prioridad) }}
                </mat-icon>
                {{ n.PRIORIDAD ?? n.prioridad }}
              </span>
              <span class="tipo-label">{{ n.TIPO ?? n.tipo ?? 'Sin tipo' }}</span>
            </div>

            <div class="nsr-body">
              <div class="nsr-row">
                <mat-icon>description</mat-icon>
                <span>{{ n.DESCRIPCION ?? n.descripcion ?? '—' }}</span>
              </div>
              <div class="nsr-row">
                <mat-icon>person</mat-icon>
                <span><strong>Domi:</strong> {{ n.DOMICILIARIO ?? n.domiciliario ?? '—' }}</span>
              </div>
              <div class="nsr-row">
                <mat-icon>people</mat-icon>
                <span><strong>Cliente:</strong> {{ n.CLIENTE ?? n.cliente ?? '—' }}</span>
              </div>
              <div class="nsr-row">
                <mat-icon>location_on</mat-icon>
                <span>{{ n.DIR_ENTREGA ?? n.direccion ?? '—' }}</span>
              </div>
            </div>

            <div class="nsr-footer">
              <span class="mins-label">
                <mat-icon style="font-size:14px;vertical-align:middle">timer</mat-icon>
                {{ n.MIN_SIN_RESOLVER ?? n.minutos_sin_resolver ?? '?' }} min sin resolver
              </span>
              <button mat-flat-button class="btn-resolver" (click)="resolver(n)">
                <mat-icon>build</mat-icon> Resolver
              </button>
            </div>

          </div>
        }
      </div>
    }
  `,
  styles: [`
    .nsr-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .nsr-header h2 { margin:0; font-size:22px; }
    .nsr-header p  { margin:2px 0 0; color:#666; font-size:13px; }
    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px; color:#999; }
    .empty mat-icon { font-size:48px; height:48px; width:48px; color:#4caf50; }
    .nsr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
    .nsr-card {
      border-radius:10px; padding:16px; background:#fff;
      border-left:5px solid #ccc; box-shadow:0 2px 8px rgba(0,0,0,.08);
    }
    .nsr-card.critica  { border-left-color:#c62828; background:#fff8f8; }
    .nsr-card.urgente  { border-left-color:#e65100; }
    .nsr-card.normal   { border-left-color:#388e3c; }
    .nsr-top { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
    .prio-badge {
      display:inline-flex; align-items:center; gap:3px;
      padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;
    }
    .prio-badge.critica { background:#ffebee; color:#c62828; }
    .prio-badge.urgente { background:#fff3e0; color:#e65100; }
    .prio-badge.normal  { background:#e8f5e9; color:#2e7d32; }
    .tipo-label { font-size:12px; color:#666; background:#f5f5f5; padding:2px 8px; border-radius:10px; }
    .nsr-body { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
    .nsr-row { display:flex; align-items:flex-start; gap:6px; font-size:13px; color:#444; }
    .nsr-row mat-icon { font-size:16px; height:16px; width:16px; color:#888; margin-top:1px; }
    .nsr-footer { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:8px; }
    .mins-label { font-size:12px; color:#555; display:flex; align-items:center; gap:3px; }
    .btn-resolver { background:#1976d2; color:#fff; font-size:13px; }
  `],
})
export class NovedadesSinResolverComponent implements OnInit {
  private svc    = inject(EntregaService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  loading   = signal(true);
  novedades = signal<any[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.novedadesSinResolver().subscribe({
      next: data => { this.novedades.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  resolver(novedad: any) {
    const noveId = novedad.NOVE_ID ?? novedad.id;
    this.dialog.open(ResolverDialogComponent, {
      data: { noveId, descripcion: novedad.DESCRIPCION ?? novedad.descripcion },
      width: '480px',
    }).afterClosed().subscribe(solucion => {
      if (!solucion) return;
      this.svc.resolverNovedadSp(noveId, solucion).subscribe({
        next: () => {
          this.snack.open('Novedad resuelta correctamente', 'OK', { duration: 4000, panelClass: 'snack-success' });
          this.load();
        },
        error: err => this.snack.open(
          err?.error?.detail || err?.error?.resultado || 'Error al resolver la novedad',
          'Cerrar', { duration: 5000, panelClass: 'snack-error' }
        ),
      });
    });
  }

  prioridadClass(p: string): string {
    const v = (p ?? '').toUpperCase();
    if (v === 'CRITICA') return 'prio-badge critica';
    if (v === 'URGENTE') return 'prio-badge urgente';
    return 'prio-badge normal';
  }

  prioridadCardClass(p: string): string {
    const v = (p ?? '').toUpperCase();
    if (v === 'CRITICA') return 'nsr-card critica';
    if (v === 'URGENTE') return 'nsr-card urgente';
    return 'nsr-card normal';
  }

  prioridadIcon(p: string): string {
    const v = (p ?? '').toUpperCase();
    if (v === 'CRITICA') return 'error';
    if (v === 'URGENTE') return 'warning';
    return 'info';
  }
}
