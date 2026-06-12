import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { SolicitudService } from '../../core/services/solicitud.service';

interface PedidoActivo {
  id: number;
  descripcion: string;
  estado: string;
  estadoCodigo: string;
  direccion: string;
}

const CATEGORIAS = [
  { label: 'Restaurantes', icon: 'restaurant',    route: '/buscar', cat: 'restaurantes' },
  { label: 'Supermercado', icon: 'shopping_cart',  route: '/buscar', cat: 'supermercado' },
  { label: 'Farmacia',     icon: 'local_pharmacy', route: '/buscar', cat: 'farmacia' },
  { label: 'Turbo',        icon: 'bolt',           route: '/buscar', cat: 'turbo' },
  { label: 'Tiendas',      icon: 'storefront',     route: '/buscar', cat: 'retail' },
];

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="inicio-wrap">

      <!-- Hero -->
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">Bienvenido, {{ nombre() }}</span>
          <h1>¿Qué quieres pedir hoy?</h1>
          <p>Restaurantes, mercado, farmacia y más — entregado rápido.</p>
          <button mat-flat-button class="btn-buscar" (click)="irA('/buscar')">
            <mat-icon>search</mat-icon> Explorar tiendas
          </button>
        </div>
        <div class="hero-img">
          <mat-icon class="hero-icon">delivery_dining</mat-icon>
        </div>
      </section>

      <!-- Categorías rápidas -->
      <section class="cats">
        <h3>Categorías</h3>
        <div class="cat-grid">
          @for (c of categorias; track c.cat) {
            <button class="cat-chip" (click)="irA(c.route)">
              <mat-icon>{{ c.icon }}</mat-icon>
              <span>{{ c.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Pedidos activos -->
      <section class="activos">
        <h3>
          <mat-icon>receipt_long</mat-icon>
          Tus pedidos activos
        </h3>
        @if (cargando()) {
          <mat-spinner diameter="32" />
        } @else if (pedidosActivos().length === 0) {
          <div class="no-pedidos">
            <mat-icon>inbox</mat-icon>
            <p>No tienes pedidos activos en este momento.</p>
            <button mat-stroked-button (click)="irA('/buscar')">Hacer un pedido</button>
          </div>
        } @else {
          <div class="pedidos-list">
            @for (p of pedidosActivos(); track p.id) {
              <div class="pedido-row">
                <div class="pedido-icon">
                  <mat-icon>{{ estadoIcon(p.estadoCodigo) }}</mat-icon>
                </div>
                <div class="pedido-info">
                  <span class="pedido-desc">{{ p.descripcion }}</span>
                  <span class="pedido-dir">{{ p.direccion }}</span>
                </div>
                <span class="estado-chip" [class]="estadoClass(p.estadoCodigo)">
                  {{ p.estado }}
                </span>
              </div>
            }
            <button mat-stroked-button class="btn-historial" (click)="irA('/mis-domicilios')">
              Ver todos mis pedidos <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        }
      </section>

      <!-- Accesos rápidos -->
      <section class="accesos">
        <h3>Accesos rápidos</h3>
        <div class="accesos-grid">
          <button class="acceso-card" (click)="irA('/mis-domicilios')">
            <mat-icon>history</mat-icon>
            <strong>Mis pedidos</strong>
            <span>Seguimiento y historial</span>
          </button>
          <button class="acceso-card" (click)="irA('/historial-cliente')">
            <mat-icon>receipt</mat-icon>
            <strong>Historial</strong>
            <span>Pedidos anteriores</span>
          </button>
          <button class="acceso-card" (click)="irA('/mi-perfil')">
            <mat-icon>account_circle</mat-icon>
            <strong>Mi perfil</strong>
            <span>Datos y contraseña</span>
          </button>
          <button class="acceso-card" (click)="soporte.set(!soporte())">
            <mat-icon>support_agent</mat-icon>
            <strong>Soporte</strong>
            <span>Ayuda y reportes</span>
          </button>
        </div>

        @if (soporte()) {
          <div class="soporte-panel">
            <h4>Centro de ayuda</h4>
            <div class="soporte-btns">
              <button mat-stroked-button (click)="irA('/mis-domicilios')">
                <mat-icon>report_problem</mat-icon> Reportar problema
              </button>
              <button mat-stroked-button (click)="irA('/historial-cliente')">
                <mat-icon>payments</mat-icon> Consultar compensación
              </button>
              <button mat-stroked-button (click)="irA('/mi-perfil')">
                <mat-icon>chat</mat-icon> Chat de soporte
              </button>
              <button mat-stroked-button (click)="irA('/historial-cliente')">
                <mat-icon>history</mat-icon> Historial de casos
              </button>
            </div>
          </div>
        }
      </section>

    </div>
  `,
  styles: [`
    .inicio-wrap { max-width:900px; margin:0 auto; padding:0 8px 40px; }

    /* Hero */
    .hero {
      display:flex; align-items:center; justify-content:space-between;
      background:linear-gradient(135deg,#1565c0,#42a5f5);
      border-radius:16px; padding:32px 28px; margin-bottom:28px; color:#fff;
    }
    .hero-text { max-width:500px; }
    .eyebrow { font-size:13px; opacity:.85; text-transform:uppercase; letter-spacing:.5px; }
    .hero-text h1 { margin:6px 0 8px; font-size:26px; line-height:1.25; }
    .hero-text p  { margin:0 0 18px; opacity:.9; font-size:14px; }
    .btn-buscar { background:#fff; color:#1565c0; font-weight:700; border-radius:50px; padding:0 20px; }
    .hero-icon { font-size:80px; height:80px; width:80px; opacity:.25; }

    /* Categorías */
    .cats, .activos, .accesos { margin-bottom:28px; }
    .cats h3, .activos h3, .accesos h3 {
      font-size:17px; font-weight:700; margin:0 0 14px;
      display:flex; align-items:center; gap:6px;
    }
    .cat-grid { display:flex; flex-wrap:wrap; gap:10px; }
    .cat-chip {
      display:flex; flex-direction:column; align-items:center; gap:4px;
      padding:14px 18px; border:2px solid #e0e0e0; border-radius:12px;
      background:#fff; cursor:pointer; font-size:12px; font-weight:600;
      color:#333; transition:all .2s; min-width:80px;
    }
    .cat-chip:hover { border-color:#1976d2; color:#1976d2; background:#e3f2fd; }
    .cat-chip mat-icon { font-size:24px; height:24px; width:24px; }

    /* Pedidos activos */
    .pedidos-list { display:flex; flex-direction:column; gap:10px; }
    .no-pedidos { text-align:center; padding:24px; color:#999; background:#fafafa; border-radius:12px; }
    .no-pedidos mat-icon { font-size:40px; height:40px; width:40px; margin-bottom:8px; }
    .pedido-row {
      display:flex; align-items:center; gap:12px; padding:12px 16px;
      background:#fff; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,.08);
    }
    .pedido-icon { background:#e3f2fd; border-radius:50%; padding:8px; }
    .pedido-icon mat-icon { color:#1976d2; }
    .pedido-info { flex:1; display:flex; flex-direction:column; gap:2px; }
    .pedido-desc { font-size:13px; font-weight:600; }
    .pedido-dir  { font-size:11px; color:#777; }
    .estado-chip { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .estado-chip.pendiente  { background:#fff9c4; color:#f57f17; }
    .estado-chip.validada   { background:#e8f5e9; color:#2e7d32; }
    .estado-chip.en_proceso { background:#e3f2fd; color:#1565c0; }
    .btn-historial { width:100%; margin-top:4px; display:flex; align-items:center; justify-content:center; gap:6px; }

    /* Accesos */
    .accesos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
    .acceso-card {
      display:flex; flex-direction:column; align-items:flex-start; gap:4px;
      padding:16px; border-radius:12px; background:#fff; border:1.5px solid #e0e0e0;
      cursor:pointer; transition:all .2s; text-align:left;
    }
    .acceso-card:hover { border-color:#1976d2; background:#f0f7ff; }
    .acceso-card mat-icon { color:#1976d2; font-size:26px; height:26px; width:26px; margin-bottom:4px; }
    .acceso-card strong { font-size:13px; }
    .acceso-card span   { font-size:11px; color:#777; }
    .soporte-panel { background:#f5f5f5; border-radius:10px; padding:16px; margin-top:12px; }
    .soporte-panel h4 { margin:0 0 12px; font-size:14px; }
    .soporte-btns { display:flex; flex-wrap:wrap; gap:8px; }
    .soporte-btns button { font-size:12px; }
  `],
})
export class InicioComponent implements OnInit {
  private auth  = inject(AuthService);
  private solSvc = inject(SolicitudService);
  private router = inject(Router);

  nombre        = signal('');
  cargando      = signal(true);
  pedidosActivos = signal<PedidoActivo[]>([]);
  soporte       = signal(false);
  categorias    = CATEGORIAS;

  ngOnInit() {
    const user = this.auth.currentUser();
    this.nombre.set(user?.name?.split(' ')[0] ?? 'Cliente');

    this.solSvc.getAll().subscribe({
      next: sols => {
        const activos = sols
          .filter((s: any) => ['PENDIENTE', 'VALIDADA', 'EN_PROCESO'].includes(s.tipoEstadoCodigo ?? ''))
          .slice(0, 3)
          .map((s: any) => ({
            id: s.id,
            descripcion: s.descripcionSolicitud?.slice(0, 60) + (s.descripcionSolicitud?.length > 60 ? '...' : ''),
            estado: s.tipoEstadoCodigo?.replace('_', ' ') ?? '—',
            estadoCodigo: (s.tipoEstadoCodigo ?? '').toLowerCase(),
            direccion: s.direccionEntregaSolicitud ?? '',
          }));
        this.pedidosActivos.set(activos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  irA(ruta: string) { this.router.navigate([ruta]); }

  estadoIcon(cod: string): string {
    if (cod === 'en_proceso') return 'delivery_dining';
    if (cod === 'validada')   return 'check_circle';
    return 'pending';
  }

  estadoClass(cod: string): string {
    return `estado-chip ${cod.toLowerCase().replace(' ', '_')}`;
  }
}
