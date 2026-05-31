import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/services/auth.service';
import { UserRole } from '../core/models/auth.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: UserRole[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      icon: 'dashboard',        route: '/dashboard', roles: ['ADMIN', 'DOMICILIARIO'] },
  { label: 'Inicio',         icon: 'storefront',       route: '/inicio', roles: ['CLIENTE'] },
  { label: 'Buscar',         icon: 'search',           route: '/buscar', roles: ['CLIENTE'] },
  { label: 'Clientes',       icon: 'people',           route: '/clientes',      roles: ['ADMIN'] },
  { label: 'Domiciliarios',  icon: 'delivery_dining',  route: '/domiciliarios', roles: ['ADMIN'] },
  { label: 'Usuarios',       icon: 'manage_accounts',  route: '/usuarios',      roles: ['ADMIN'] },
  { label: 'Solicitudes',    icon: 'assignment',       route: '/solicitudes',   roles: ['ADMIN', 'CLIENTE'] },
  { label: 'Asignaciones',        icon: 'task_alt',         route: '/asignaciones',         roles: ['ADMIN'] },
  { label: 'Entregas',            icon: 'local_shipping',   route: '/entregas',             roles: ['ADMIN'] },
  { label: 'Tracking',            icon: 'location_on',      route: '/tracking',             roles: ['ADMIN'] },
  { label: 'Tipos Maestra',       icon: 'category',         route: '/tipos-maestra',        roles: ['ADMIN'] },
  { label: 'Mis Pedidos',         icon: 'receipt_long',     route: '/mis-domicilios',       roles: ['CLIENTE'] },
  { label: 'Historial',           icon: 'history',          route: '/historial-cliente',    roles: ['CLIENTE'] },
  { label: 'Pedidos Disponibles', icon: 'inbox',            route: '/pedidos-disponibles',  roles: ['DOMICILIARIO'] },
  { label: 'En Ruta',             icon: 'delivery_dining',  route: '/en-ruta',              roles: ['DOMICILIARIO'] },
  { label: 'Historial',           icon: 'history',          route: '/historial-domi',       roles: ['DOMICILIARIO'] },
  { label: 'Mi Perfil',           icon: 'account_circle',   route: '/mi-perfil',            roles: ['CLIENTE', 'DOMICILIARIO'] },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  currentDate = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  currentUser = this.auth.currentUser;

  navItems = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return ALL_NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user.role));
  });

  roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role;
    const map: Record<string, string> = { ADMIN: 'Administrador', CLIENTE: 'Cliente', DOMICILIARIO: 'Domiciliario' };
    return role ? (map[role] ?? role) : '';
  });

  roleClass = computed(() => {
    const role = this.auth.currentUser()?.role;
    const map: Record<string, string> = { ADMIN: 'role-admin', CLIENTE: 'role-cliente', DOMICILIARIO: 'role-dom' };
    return role ? (map[role] ?? '') : '';
  });

  pageTitle = signal('Dashboard');
  pageDesc  = signal('Resumen general del sistema');

  readonly pageMeta: Record<string, { title: string; desc: string }> = {
    '/dashboard':     { title: 'Dashboard',          desc: 'Resumen general del sistema' },
    '/inicio':        { title: 'Inicio',             desc: 'Compra en restaurantes, mercado, farmacia, turbo y tiendas' },
    '/buscar':        { title: 'Buscar',             desc: 'Encuentra productos, comercios, promociones y entregas rápidas' },
    '/clientes':      { title: 'Clientes',            desc: 'Gestión de clientes registrados' },
    '/domiciliarios': { title: 'Domiciliarios',       desc: 'Gestión de repartidores' },
    '/usuarios':      { title: 'Usuarios',            desc: 'Credenciales, roles y vínculos operativos' },
    '/solicitudes':   { title: 'Solicitudes',         desc: 'Pedidos y solicitudes de entrega' },
    '/asignaciones':  { title: 'Asignaciones',        desc: 'Asignación de entregas a domiciliarios' },
    '/entregas':      { title: 'Entregas',            desc: 'Seguimiento y novedades de entregas' },
    '/tracking':      { title: 'Tracking',            desc: 'Ubicaciones en tiempo real' },
    '/tipos-maestra': { title: 'Tipos Maestra',       desc: 'Configuración de tipos y estados' },
    '/mis-domicilios':       { title: 'Mis Pedidos',           desc: 'Seguimiento de tus entregas activas' },
    '/historial-cliente':    { title: 'Historial',             desc: 'Pedidos completados y rechazados' },
    '/pedidos-disponibles':  { title: 'Pedidos Disponibles',   desc: 'Pedidos publicados esperando domiciliario' },
    '/en-ruta':              { title: 'En Ruta',               desc: 'Entregas activas y compartir ubicación GPS' },
    '/historial-domi':       { title: 'Historial',             desc: 'Historial completo de tus entregas' },
    '/mi-perfil':            { title: 'Mi Perfil',             desc: 'Tu información personal' },
  };

  onRouteActivate(_: any) {
    const path = window.location.pathname;
    const meta = this.pageMeta[path];
    if (meta) {
      this.pageTitle.set(meta.title);
      this.pageDesc.set(meta.desc);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
