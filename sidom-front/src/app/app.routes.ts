import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/role-redirect').then(m => m.RoleRedirectComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'inicio',
        canActivate: [roleGuard('CLIENTE')],
        loadComponent: () => import('./pages/cliente-home/cliente-home').then(m => m.ClienteHomeComponent)
      },
      {
        path: 'buscar',
        canActivate: [roleGuard('CLIENTE')],
        loadComponent: () => import('./pages/cliente-home/cliente-home').then(m => m.ClienteHomeComponent)
      },
      {
        path: 'clientes',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/clientes/clientes').then(m => m.ClientesComponent)
      },
      {
        path: 'domiciliarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/domiciliarios/domiciliarios').then(m => m.DomiciliariosComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosComponent)
      },
      {
        path: 'solicitudes',
        canActivate: [roleGuard('ADMIN', 'CLIENTE')],
        loadComponent: () => import('./pages/solicitudes/solicitudes').then(m => m.SolicitudesComponent)
      },
      {
        path: 'asignaciones',
        canActivate: [roleGuard('ADMIN', 'DOMICILIARIO')],
        loadComponent: () => import('./pages/asignaciones/asignaciones').then(m => m.AsignacionesComponent)
      },
      {
        path: 'entregas',
        canActivate: [roleGuard('ADMIN', 'DOMICILIARIO')],
        loadComponent: () => import('./pages/entregas/entregas').then(m => m.EntregasComponent)
      },
      {
        path: 'tracking',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/tracking/tracking').then(m => m.TrackingComponent)
      },
      {
        path: 'tipos-maestra',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./pages/tipos-maestra/tipos-maestra').then(m => m.TiposMaestraComponent)
      },
      {
        path: 'pedidos-disponibles',
        canActivate: [roleGuard('DOMICILIARIO', 'ADMIN')],
        loadComponent: () => import('./pages/pedidos-disponibles/pedidos-disponibles').then(m => m.PedidosDisponiblesComponent)
      },
      {
        path: 'en-ruta',
        canActivate: [roleGuard('DOMICILIARIO', 'ADMIN')],
        loadComponent: () => import('./pages/en-ruta/en-ruta').then(m => m.EnRutaComponent)
      },
      {
        path: 'historial-domi',
        canActivate: [roleGuard('DOMICILIARIO', 'ADMIN')],
        loadComponent: () => import('./pages/historial-domi/historial-domi').then(m => m.HistorialDomiComponent)
      },
      {
        path: 'mis-domicilios',
        canActivate: [roleGuard('CLIENTE', 'ADMIN')],
        loadComponent: () => import('./pages/mis-domicilios/mis-domicilios').then(m => m.MisDomiciliosComponent)
      },
      {
        path: 'historial-cliente',
        canActivate: [roleGuard('CLIENTE', 'ADMIN')],
        loadComponent: () => import('./pages/historial-cliente/historial-cliente').then(m => m.HistorialClienteComponent)
      },
      {
        path: 'mi-perfil',
        canActivate: [roleGuard('CLIENTE', 'DOMICILIARIO')],
        loadComponent: () => import('./pages/mi-perfil/mi-perfil').then(m => m.MiPerfilComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
