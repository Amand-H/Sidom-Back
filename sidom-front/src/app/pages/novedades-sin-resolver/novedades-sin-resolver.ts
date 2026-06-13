import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EntregaService } from '../../core/services/entrega.service';

@Component({
  selector: 'app-novedades-sin-resolver',
  standalone: true,
  imports: [
    MatProgressSpinnerModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <div class="nsr-header">
      <div>
        <h2>Novedades de Emergencia</h2>
        <p>Alertas SOS reportadas por domiciliarios</p>
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
              <div class="sos-badge">
                <mat-icon>sos</mat-icon>
                EMERGENCIA SOS
              </div>
              <span class="prio-badge" [class]="prioridadClass(n.PRIORIDAD ?? n.prioridad)">
                <mat-icon style="font-size:13px;vertical-align:middle">
                  {{ prioridadIcon(n.PRIORIDAD ?? n.prioridad) }}
                </mat-icon>
                {{ n.PRIORIDAD ?? n.prioridad }}
              </span>
            </div>

            <div class="nsr-body">
              <div class="nsr-row">
                <mat-icon>description</mat-icon>
                <span>{{ n.DESCRIPCION ?? n.descripcion ?? '—' }}</span>
              </div>
              <div class="nsr-row">
                <mat-icon>delivery_dining</mat-icon>
                <span><strong>Domiciliario:</strong> {{ n.DOMICILIARIO ?? n.domiciliario ?? '—' }}</span>
              </div>
              <div class="nsr-row">
                <mat-icon>person</mat-icon>
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
                {{ n.MIN_SIN_RESOLVER ?? n.minutos_sin_resolver ?? '?' }} min desde el reporte
              </span>
              <span class="estado-label">
                <mat-icon style="font-size:14px;vertical-align:middle">visibility</mat-icon>
                Notificado
              </span>
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
    .nsr-top { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
    .sos-badge {
      display:inline-flex; align-items:center; gap:4px;
      padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;
      background:#c62828; color:white; text-transform:uppercase;
    }
    .sos-badge mat-icon { font-size:16px; height:16px; width:16px; }
    .prio-badge {
      display:inline-flex; align-items:center; gap:3px;
      padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;
    }
    .prio-badge.critica { background:#ffebee; color:#c62828; }
    .prio-badge.urgente { background:#fff3e0; color:#e65100; }
    .prio-badge.normal  { background:#e8f5e9; color:#2e7d32; }
    .nsr-body { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
    .nsr-row { display:flex; align-items:flex-start; gap:6px; font-size:13px; color:#444; }
    .nsr-row mat-icon { font-size:16px; height:16px; width:16px; color:#888; margin-top:1px; }
    .nsr-footer { display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:8px; }
    .mins-label { font-size:12px; color:#555; display:flex; align-items:center; gap:3px; }
    .estado-label { font-size:12px; color:#388e3c; font-weight:600; display:flex; align-items:center; gap:3px; }
  `],
})
export class NovedadesSinResolverComponent implements OnInit {
  private svc = inject(EntregaService);

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