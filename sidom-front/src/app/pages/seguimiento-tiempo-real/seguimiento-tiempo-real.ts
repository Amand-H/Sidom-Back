import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EntregaService } from '../../core/services/entrega.service';

@Component({
  selector: 'app-seguimiento-tiempo-real',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="str-header">
      <div>
        <h2>Seguimiento en Tiempo Real</h2>
        <p>Todas las entregas activas con alertas de cumplimiento</p>
      </div>
      <button mat-icon-button (click)="load()" title="Actualizar"><mat-icon>refresh</mat-icon></button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="48" /></div>
    } @else if (entregas().length === 0) {
      <div class="empty">
        <mat-icon>local_shipping</mat-icon>
        <p>No hay entregas activas en este momento.</p>
      </div>
    } @else {
      <div class="str-grid">
        @for (e of entregas(); track e.SEGU_ID ?? e.seguimiento) {
          <div class="str-card" [class]="cardClass(e)">
            <div class="str-top">
              <span class="alerta-badge" [class]="alertaClass(e.ALERTA ?? e.alerta)">
                <mat-icon style="font-size:14px;vertical-align:middle">
                  {{ alertaIcon(e.ALERTA ?? e.alerta) }}
                </mat-icon>
                {{ e.ALERTA ?? e.alerta }}
              </span>
              @if ((e.MODALIDAD ?? e.modalidad)?.toLowerCase()?.includes('express')) {
                <span class="express-tag"><mat-icon style="font-size:13px">bolt</mat-icon>EXPRESS</span>
              }
            </div>

            <div class="str-body">
              <div class="str-row">
                <mat-icon>person</mat-icon>
                <span><strong>Domi:</strong> {{ e.DOMICILIARIO ?? e.domiciliario ?? '—' }}</span>
              </div>
              <div class="str-row">
                <mat-icon>people</mat-icon>
                <span><strong>Cliente:</strong> {{ e.CLIENTE ?? e.cliente ?? '—' }}</span>
              </div>
              <div class="str-row">
                <mat-icon>location_on</mat-icon>
                <span>{{ e.DIR_ENTREGA ?? e.direccionEntrega ?? '—' }}</span>
              </div>
              <div class="str-row">
                <mat-icon>map</mat-icon>
                <span>{{ e.ZONA ?? e.zona ?? '—' }}</span>
              </div>
            </div>

            <div class="str-footer">
              <span class="estado-badge" [class]="estadoClass(e.ESTADO ?? e.estadoActual)">
                {{ e.ESTADO ?? e.estadoActual }}
              </span>
              <span class="tiempo-info">
                <mat-icon style="font-size:14px;vertical-align:middle">schedule</mat-icon>
                {{ e.TIEMPO_ESTIMADO ?? e.tiempo_estimado ?? '—' }} min estimado
              </span>
              @if ((e.MIN_RETRASO ?? e.minutos_retraso) > 0) {
                <span class="retraso">
                  <mat-icon style="font-size:14px;vertical-align:middle">warning</mat-icon>
                  +{{ e.MIN_RETRASO ?? e.minutos_retraso }} min retraso
                </span>
              }
            </div>

            <!-- Compensación: solo para RETRASADO / CRITICO -->
            @if (esRetraso(e)) {
              <div class="str-comp">
                @if (e.compValor) {
                  <div class="ya-compensado">
                    <mat-icon>check_circle</mat-icon>
                    {{ compLabel(e.compValor) }}
                  </div>
                } @else {
                  @if (compensandoId() === (e.SEGU_ID ?? e.seguimiento)) {
                    <div class="comp-form">
                      <input #montoInput type="number" class="comp-input"
                             placeholder="Valor compensación ($)" min="1">
                      <div class="comp-actions">
                        <button mat-flat-button color="primary"
                                [disabled]="compGuardando()"
                                (click)="guardarComp(e.SEGU_ID ?? e.seguimiento, montoInput.value)">
                          <mat-icon>save</mat-icon> Guardar
                        </button>
                        <button mat-button (click)="compensandoId.set(null)">Cancelar</button>
                      </div>
                    </div>
                  } @else {
                    <button mat-stroked-button class="btn-compensar"
                            (click)="compensandoId.set(e.SEGU_ID ?? e.seguimiento)">
                      <mat-icon>payments</mat-icon> Registrar compensación
                    </button>
                  }
                }
              </div>
            }

          </div>
        }
      </div>
    }
  `,
  styles: [`
    .str-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .str-header h2 { margin:0; font-size:22px; }
    .str-header p  { margin:2px 0 0; color:#666; font-size:13px; }
    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px; color:#999; }
    .empty mat-icon { font-size:48px; height:48px; width:48px; }
    .str-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
    .str-card {
      border-radius:10px; padding:16px; background:#fff;
      border-left:5px solid #ccc; box-shadow:0 2px 8px rgba(0,0,0,.08);
    }
    .str-card.en-tiempo { border-left-color:#2e7d32; }
    .str-card.retrasado  { border-left-color:#f57c00; }
    .str-card.critico    { border-left-color:#c62828; background:#fff8f8; }
    .str-top { display:flex; gap:8px; margin-bottom:10px; align-items:center; flex-wrap:wrap; }
    .alerta-badge {
      display:inline-flex; align-items:center; gap:3px;
      padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;
    }
    .alerta-badge.en-tiempo { background:#e8f5e9; color:#2e7d32; }
    .alerta-badge.retrasado  { background:#fff3e0; color:#e65100; }
    .alerta-badge.critico    { background:#ffebee; color:#c62828; }
    .express-tag {
      display:inline-flex; align-items:center; gap:2px;
      background:#ff6f00; color:#fff; border-radius:10px;
      padding:2px 8px; font-size:10px; font-weight:700;
    }
    .str-body { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
    .str-row { display:flex; align-items:center; gap:6px; font-size:13px; color:#444; }
    .str-row mat-icon { font-size:16px; height:16px; width:16px; color:#888; }
    .str-footer { display:flex; flex-wrap:wrap; align-items:center; gap:8px; border-top:1px solid #eee; padding-top:8px; font-size:12px; }
    .estado-badge { padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; }
    .estado-badge.recogido    { background:#ede7f6; color:#4527a0; }
    .estado-badge.en_camino   { background:#e3f2fd; color:#0d47a1; }
    .estado-badge.entregado   { background:#e8f5e9; color:#1b5e20; }
    .estado-badge.con_novedad { background:#ffebee; color:#b71c1c; }
    .tiempo-info { color:#555; display:flex; align-items:center; gap:3px; }
    .retraso { color:#e65100; display:flex; align-items:center; gap:3px; font-weight:600; }

    /* Compensación */
    .str-comp { border-top:1px solid #eee; padding-top:10px; margin-top:8px; }
    .btn-compensar { color:#e65100; border-color:#ffcc80; font-size:12px; width:100%; }
    .btn-compensar mat-icon { font-size:16px; height:16px; width:16px; vertical-align:middle; }
    .comp-form { display:flex; flex-direction:column; gap:8px; }
    .comp-input {
      width:100%; padding:8px 10px; border:1.5px solid #ffcc80; border-radius:6px;
      font-size:14px; outline:none; box-sizing:border-box;
    }
    .comp-input:focus { border-color:#f57c00; }
    .comp-actions { display:flex; gap:8px; }
  `],
})
export class SeguimientoTiempoRealComponent implements OnInit {
  private svc   = inject(EntregaService);
  private snack = inject(MatSnackBar);

  loading        = signal(true);
  entregas       = signal<any[]>([]);
  compensandoId  = signal<number | null>(null);
  compGuardando  = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.tiempoReal().subscribe({
      next: data => { this.entregas.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  esRetraso(e: any): boolean {
    const a = (e.ALERTA ?? e.alerta ?? '').toUpperCase();
    return a === 'RETRASADO' || a === 'CRITICO';
  }

  guardarComp(seguId: number, montoStr: string) {
    const monto = Number(montoStr);
    if (!monto || monto <= 0) {
      this.snack.open('Ingrese un valor válido mayor a 0', 'OK', { duration: 2500 });
      return;
    }
    this.compGuardando.set(true);
    const today = new Date().toISOString().split('T')[0];
    this.svc.patchSeguimiento(seguId, { compValor: monto, compFecha: today }).subscribe({
      next: () => {
        this.snack.open('Compensación registrada correctamente', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.compensandoId.set(null);
        this.compGuardando.set(false);
        this.load();
      },
      error: () => {
        this.snack.open('Error al registrar compensación', 'Cerrar', { duration: 3000, panelClass: 'snack-error' });
        this.compGuardando.set(false);
      },
    });
  }

  alertaClass(a: string): string {
    const v = (a ?? '').toUpperCase();
    if (v === 'EN TIEMPO' || v === 'EN_TIEMPO') return 'alerta-badge en-tiempo';
    if (v === 'RETRASADO') return 'alerta-badge retrasado';
    if (v === 'CRITICO')   return 'alerta-badge critico';
    return 'alerta-badge';
  }

  alertaIcon(a: string): string {
    const v = (a ?? '').toUpperCase();
    if (v.includes('TIEMPO')) return 'check_circle';
    if (v === 'RETRASADO')    return 'schedule';
    if (v === 'CRITICO')      return 'error';
    return 'info';
  }

  cardClass(e: any): string {
    const a = (e.ALERTA ?? e.alerta ?? '').toUpperCase();
    if (a === 'EN TIEMPO' || a === 'EN_TIEMPO') return 'str-card en-tiempo';
    if (a === 'RETRASADO') return 'str-card retrasado';
    if (a === 'CRITICO')   return 'str-card critico';
    return 'str-card';
  }

  estadoClass(e: string): string {
    return `estado-badge ${(e ?? '').toLowerCase().replace(' ', '_')}`;
  }

  compLabel(v: any): string {
    return 'Compensación registrada: $' + Number(v).toFixed(0);
  }
}
