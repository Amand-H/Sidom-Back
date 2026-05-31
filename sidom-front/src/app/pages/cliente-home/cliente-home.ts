import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { SolicitudService } from '../../core/services/solicitud.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { TipoMaestra } from '../../core/models/tipo-maestra.model';

type CategoryId = 'restaurantes' | 'supermercado' | 'farmacia' | 'turbo' | 'retail';

interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  serviceCode: string;
}

interface Product {
  id: number;
  storeId: number;
  name: string;
  description: string;
  price: number;
  image: string;
  promo?: string;
  customizable?: boolean;
}

interface Store {
  id: number;
  category: CategoryId;
  name: string;
  subtitle: string;
  rating: number;
  eta: number;
  deliveryFee: number;
  image: string;
  tags: string[];
  products: Product[];
  favorite?: boolean;
}

interface CartItem {
  product: Product;
  store: Store;
  quantity: number;
}

const CATEGORIES: Category[] = [
  { id: 'restaurantes', label: 'Restaurantes', icon: 'restaurant', serviceCode: 'COMIDA' },
  { id: 'supermercado', label: 'Supermercado', icon: 'shopping_cart', serviceCode: 'SUPERMERCADO' },
  { id: 'farmacia', label: 'Farmacia', icon: 'local_pharmacy', serviceCode: 'FARMACIA' },
  { id: 'turbo', label: 'Turbo', icon: 'bolt', serviceCode: 'SUPERMERCADO' },
  { id: 'retail', label: 'Tiendas', icon: 'storefront', serviceCode: 'MENSAJERIA' },
];

const STORES: Store[] = [
  {
    id: 1,
    category: 'restaurantes',
    name: 'Burger Valkiria',
    subtitle: 'Hamburguesas artesanales',
    rating: 4.8,
    eta: 28,
    deliveryFee: 4500,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    tags: ['2x1', 'Popular', 'Cupones'],
    favorite: true,
    products: [
      { id: 101, storeId: 1, name: 'Burger fuego', description: 'Carne, queso, tocineta y salsa de la casa', price: 24500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', promo: '15% OFF', customizable: true },
      { id: 102, storeId: 1, name: 'Papas criollas', description: 'Papas con cheddar y tocineta', price: 11500, image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=600&q=80' },
      { id: 103, storeId: 1, name: 'Limonada cerezada', description: 'Bebida natural fría', price: 6900, image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  {
    id: 2,
    category: 'restaurantes',
    name: 'Pizzería Centro',
    subtitle: 'Pizza, pasta y bebidas',
    rating: 4.6,
    eta: 35,
    deliveryFee: 5200,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    tags: ['Familiar', 'Promos'],
    products: [
      { id: 201, storeId: 2, name: 'Pizza pepperoni mediana', description: '8 porciones con extra queso', price: 32900, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', promo: 'Combo' },
      { id: 202, storeId: 2, name: 'Lasagna boloñesa', description: 'Porción individual gratinada', price: 21900, image: 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  {
    id: 3,
    category: 'supermercado',
    name: 'Mercado Fresh',
    subtitle: 'Frutas, despensa y hogar',
    rating: 4.7,
    eta: 45,
    deliveryFee: 3900,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    tags: ['Mercado', 'Sustituciones'],
    products: [
      { id: 301, storeId: 3, name: 'Canasta de frutas', description: 'Banano, manzana, pera y uvas', price: 28500, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80', promo: 'Fresco' },
      { id: 302, storeId: 3, name: 'Leche deslactosada', description: 'Sixpack por litro', price: 23800, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80' },
      { id: 303, storeId: 3, name: 'Café molido premium', description: 'Bolsa 500 g', price: 18400, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  {
    id: 4,
    category: 'farmacia',
    name: 'Farmacia Sana',
    subtitle: 'Medicamentos y cuidado personal',
    rating: 4.9,
    eta: 22,
    deliveryFee: 3500,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
    tags: ['Entrega rápida', 'Salud'],
    products: [
      { id: 401, storeId: 4, name: 'Kit cuidado personal', description: 'Gel antibacterial, tapabocas y pañitos', price: 19900, image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80' },
      { id: 402, storeId: 4, name: 'Vitamina C', description: 'Tabletas por 30 unidades', price: 26500, image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?auto=format&fit=crop&w=600&q=80', promo: 'Salud' },
    ],
  },
  {
    id: 5,
    category: 'turbo',
    name: 'SIDOM Turbo',
    subtitle: 'Básicos en pocos minutos',
    rating: 4.8,
    eta: 12,
    deliveryFee: 2900,
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80',
    tags: ['Ultra rápido', 'Básicos'],
    products: [
      { id: 501, storeId: 5, name: 'Combo noche', description: 'Snacks, bebida y chocolate', price: 17900, image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80', promo: '12 min' },
      { id: 502, storeId: 5, name: 'Agua y bebidas', description: 'Pack hidratación', price: 12900, image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80' },
    ],
  },
  {
    id: 6,
    category: 'retail',
    name: 'Retail Express',
    subtitle: 'Tecnología, hogar, mascotas y regalos',
    rating: 4.5,
    eta: 50,
    deliveryFee: 6500,
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80',
    tags: ['Retail', 'Regalos'],
    products: [
      { id: 601, storeId: 6, name: 'Audífonos bluetooth', description: 'Carga rápida y estuche', price: 89900, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
      { id: 602, storeId: 6, name: 'Set hogar', description: 'Aromas, velas y organizador', price: 45900, image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80', promo: 'Regalo' },
    ],
  },
];

@Component({
  selector: 'app-cliente-home',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './cliente-home.html',
  styleUrl: './cliente-home.css',
})
export class ClienteHomeComponent implements OnInit {
  private auth = inject(AuthService);
  private clienteSvc = inject(ClienteService);
  private solicitudSvc = inject(SolicitudService);
  private tipoSvc = inject(TipoMaestraService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(true);
  ordering = signal(false);
  activeCategory = signal<CategoryId>('restaurantes');
  query = signal('');
  maxEta = signal(60);
  onlyPromo = signal(false);
  cart = signal<CartItem[]>([]);
  checkoutOpen = signal(false);
  selectedPayment = signal('Tarjeta terminada en 4242');
  coupon = signal('');
  tip = signal(2000);
  deliveryAddress = signal('');
  supportOpen = signal(false);
  tipos = signal<TipoMaestra[]>([]);

  categories = CATEGORIES;
  stores = STORES;
  recent = ['Burger fuego', 'Canasta de frutas', 'Kit cuidado personal'];

  filteredStores = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.stores
      .filter(s => s.category === this.activeCategory())
      .filter(s => s.eta <= this.maxEta())
      .filter(s => !this.onlyPromo() || s.tags.some(t => t.toLowerCase().includes('promo') || t.includes('2x1')) || s.products.some(p => p.promo))
      .filter(s => !q || `${s.name} ${s.subtitle} ${s.tags.join(' ')} ${s.products.map(p => p.name).join(' ')}`.toLowerCase().includes(q));
  });

  visibleProducts = computed(() => this.filteredStores().flatMap(store => store.products.map(product => ({ store, product }))));
  subtotal = computed(() => this.cart().reduce((total, item) => total + item.product.price * item.quantity, 0));
  deliveryFee = computed(() => this.cart().length ? Math.max(...this.cart().map(item => item.store.deliveryFee)) : 0);
  discount = computed(() => this.coupon().trim().toUpperCase() === 'SIDOM10' ? Math.round(this.subtotal() * 0.1) : 0);
  total = computed(() => Math.max(this.subtotal() + this.deliveryFee() + this.tip() - this.discount(), 0));
  cartCount = computed(() => this.cart().reduce((total, item) => total + item.quantity, 0));

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user?.entityId) {
      this.loading.set(false);
      return;
    }

    this.clienteSvc.getById(user.entityId).subscribe({
      next: cliente => this.deliveryAddress.set(cliente.direccionCliente),
      error: () => undefined,
    });

    this.tipoSvc.getAll().subscribe({
      next: tipos => { this.tipos.set(tipos); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectCategory(category: CategoryId) {
    this.activeCategory.set(category);
  }

  add(product: Product, store: Store) {
    const items = [...this.cart()];
    const current = items.find(item => item.product.id === product.id);
    if (current) current.quantity += 1;
    else items.push({ product, store, quantity: 1 });
    this.cart.set(items);
  }

  decrease(productId: number) {
    const items = this.cart()
      .map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter(item => item.quantity > 0);
    this.cart.set(items);
  }

  increase(productId: number) {
    const items = this.cart().map(item => item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
    this.cart.set(items);
  }

  clearCart() {
    this.cart.set([]);
    this.checkoutOpen.set(false);
  }

  money(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  productQty(productId: number) {
    return this.cart().find(item => item.product.id === productId)?.quantity ?? 0;
  }

  checkout() {
    if (!this.cart().length) {
      this.snack.open('Agrega productos al carrito', 'Cerrar', { duration: 2500, panelClass: 'snack-error' });
      return;
    }
    this.checkoutOpen.set(true);
  }

  confirmOrder() {
    const user = this.auth.currentUser();
    if (!user?.entityId) {
      this.snack.open('Tu cuenta no está vinculada a un cliente', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      return;
    }
    if (!this.deliveryAddress().trim()) {
      this.snack.open('Selecciona una dirección de entrega', 'Cerrar', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    const serviceCode = this.categoryForCart().serviceCode;
    const tipoServicio = this.findTipo(serviceCode);
    const tipoZona = this.findTipo('ZONA_NORTE') ?? this.firstChildOf('CAT_ZONA');

    if (!tipoServicio || !tipoZona) {
      this.snack.open('Faltan catálogos de servicio o zona en tipos maestra', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      return;
    }

    const stores = Array.from(new Set(this.cart().map(item => item.store.name))).join(', ');
    const items = this.cart().map(item => `${item.quantity}x ${item.product.name}`).join(', ');

    const payload = {
      cliente: user.entityId,
      tipoServicio: tipoServicio.id,
      tipoZona: tipoZona.id,
      descripcionSolicitud: `${items}. Total estimado ${this.money(this.total())}. Pago: ${this.selectedPayment()}`,
      direccionRecogidaSolicitud: stores,
      direccionEntregaSolicitud: this.deliveryAddress().trim(),
      tipoMotivoRechazo: null,
    };

    this.ordering.set(true);
    this.solicitudSvc.post(payload as any).subscribe({
      next: () => {
        this.ordering.set(false);
        this.snack.open('Pedido creado. Puedes seguirlo en Mis Pedidos.', 'OK', { duration: 4000, panelClass: 'snack-success' });
        this.clearCart();
        this.router.navigate(['/mis-domicilios']);
      },
      error: err => {
        this.ordering.set(false);
        this.snack.open(JSON.stringify(err?.error) || 'No se pudo crear el pedido', 'Cerrar', { duration: 6000, panelClass: 'snack-error' });
      },
    });
  }

  private categoryForCart(): Category {
    const first = this.cart()[0]?.store.category ?? this.activeCategory();
    return this.categories.find(category => category.id === first) ?? this.categories[0];
  }

  private findTipo(codigo: string) {
    return this.tipos().find(tipo => tipo.codigoTipo === codigo);
  }

  private firstChildOf(codigoCategoria: string) {
    const parent = this.findTipo(codigoCategoria);
    return this.tipos().find(tipo => tipo.padreTipo === parent?.id);
  }
}
