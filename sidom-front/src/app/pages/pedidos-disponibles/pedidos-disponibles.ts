import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsignacionService } from '../../core/services/asignacion.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pedidos-disponibles',
  imports: [MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './pedidos-disponibles.html',
  styleUrl: './pedidos-disponibles.css',
})
export class PedidosDisponiblesComponent implements OnInit {
  private asignSvc = inject(AsignacionService);
  private auth     = inject(AuthService);
  private snack    = inject(MatSnackBar);

  loading  = signal(true);
  pedidos  = signal<any[]>([]);
  accepting = signal<number | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.asignSvc.panelPool().subscribe({
      next: data => { this.pedidos.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  aceptar(pedido: any) {
    const entityId = this.auth.currentUser()?.entityId;
    if (!entityId) {
      this.snack.open('No se encontró tu ID de domiciliario', 'Cerrar', { duration: 4000 });
      return;
    }
    this.accepting.set(pedido.SOLI_DISP_ID);

    const request$ = this.isExpress(pedido)
      ? this.asignSvc.asignarExpress(pedido.SOLI_DISP_ID)
      : this.asignSvc.aceptarDisponible(pedido.SOLI_DISP_ID, entityId);

    request$.subscribe({
      next: (res: any) => {
        this.accepting.set(null);
        // SP returns { resultado: '...' } — check for error prefix
        const resultado: string = res?.resultado ?? res?.detail ?? '';
        if (resultado.toLowerCase().startsWith('error')) {
          this.snack.open(resultado, 'Cerrar', { duration: 6000, panelClass: 'snack-error' });
          this.load();
          return;
        }
        const msg = this.isExpress(pedido)
          ? '¡Pedido Express asignado automáticamente!'
          : '¡Pedido aceptado! Aparece en tu sección "En Ruta".';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-success' });
        this.load();
      },
      error: err => {
        this.accepting.set(null);
        this.snack.open(err?.error?.detail || err?.error?.resultado || 'Error al aceptar el pedido', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }

  isExpress(pedido: any): boolean { return pedido.MODALIDAD === 'Express'; }

  alertaClass(alerta: string): string {
    if (alerta === 'URGENTE') return 'badge danger';
    if (alerta === 'NORMAL')  return 'badge success';
    return 'badge warning';
  }

  svcIcon(s: string): string {
    const v = (s ?? '').toLowerCase();
    if (v.includes('comida'))   return 'restaurant';
    if (v.includes('farmacia')) return 'local_pharmacy';
    if (v.includes('super'))    return 'shopping_cart';
    if (v.includes('mensaj'))   return 'mail';
    return 'store';
  }
}
