import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SolicitudService } from '../../core/services/solicitud.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { AuthService } from '../../core/services/auth.service';
import { Cotizacion } from '../../core/models/solicitud.model';
import { TipoMaestra } from '../../core/models/tipo-maestra.model';

@Component({
  selector: 'app-pedido-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <span class="material-icons">add_shopping_cart</span>
        <div>
          <h2>Hacer un pedido</h2>
          <p>Completa los datos de tu entrega</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close(false)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body" [formGroup]="form">

        <!-- Modalidad -->
        <div class="modalidad-selector">
          @for (m of modalidades(); track m.id) {
            <button type="button"
              [class]="m.codigoTipo === 'MOD_EXPRESS' ? 'modal-btn express-btn' : 'modal-btn'"
              [class.active]="form.get('tipoModalidad')?.value === m.id"
              (click)="form.get('tipoModalidad')?.setValue(m.id ?? null)">
              @if (m.codigoTipo === 'MOD_EXPRESS') {
                <div class="express-header">
                  <mat-icon class="express-icon">bolt</mat-icon>
                  <span class="express-label">EXPRESS</span>
                </div>
                <span class="modal-name">{{ m.nombreTipo }}</span>
                <span class="modal-desc">Prioritario · Tarifa diferencial</span>
              } @else {
                <mat-icon>local_shipping</mat-icon>
                <span class="modal-name">{{ m.nombreTipo }}</span>
                <span class="modal-desc">Tarifa estándar</span>
              }
            </button>
          }
        </div>

        <!-- Cotización -->
        @if (cotizacion()) {
          <div class="cotizacion-box" [class.limitada]="cotizacion()!.capacidad !== 'ALTA'">
            <mat-icon>{{ cotizacion()!.capacidad === 'ALTA' ? 'check_circle' : 'schedule' }}</mat-icon>
            <div>
              <strong>Capacidad {{ cotizacion()!.capacidad }}</strong>
              &nbsp;—&nbsp;Tiempo estimado: <strong>{{ cotizacion()!.tiempo_estimado }} min</strong>
              &nbsp;·&nbsp;{{ cotizacion()!.domi_disponibles }}/{{ cotizacion()!.domi_totales }} domiciliarios disponibles
              @if (cotizacion()!.capacidad !== 'ALTA') {
                <span class="espera-hint">&nbsp;(si hay espera: ~{{ cotizacion()!.tiempo_si_espera }} min)</span>
              }
            </div>
          </div>
        }

        <!-- Servicio -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de servicio</mat-label>
          <mat-select formControlName="tipoServicio">
            @for (t of servicios(); track t.id) {
              <mat-option [value]="t.id">{{ t.nombreTipo }}</mat-option>
            }
          </mat-select>
          <mat-icon matSuffix>category</mat-icon>
          @if (form.get('tipoServicio')?.hasError('required') && form.get('tipoServicio')?.touched) {
            <mat-error>Selecciona un tipo de servicio</mat-error>
          }
        </mat-form-field>

        <!-- Zona -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Zona de cobertura</mat-label>
          <mat-select formControlName="tipoZona">
            @for (t of zonas(); track t.id) {
              <mat-option [value]="t.id">{{ t.nombreTipo }}</mat-option>
            }
          </mat-select>
          <mat-icon matSuffix>map</mat-icon>
          @if (form.get('tipoZona')?.hasError('required') && form.get('tipoZona')?.touched) {
            <mat-error>Selecciona una zona</mat-error>
          }
        </mat-form-field>

        <!-- Descripción -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>¿Qué necesitas?</mat-label>
          <textarea matInput formControlName="descripcionSolicitud" rows="3"
                    placeholder="Describe tu pedido (ej: 2 combos Big Mac, sin pepino...)"></textarea>
          @if (form.get('descripcionSolicitud')?.hasError('required') && form.get('descripcionSolicitud')?.touched) {
            <mat-error>Describe tu pedido</mat-error>
          }
          @if (form.get('descripcionSolicitud')?.hasError('minlength') && form.get('descripcionSolicitud')?.touched) {
            <mat-error>Mínimo 10 caracteres</mat-error>
          }
        </mat-form-field>

        <!-- Dirección recogida -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección de recogida (opcional)</mat-label>
          <input matInput formControlName="direccionRecogidaSolicitud"
                 placeholder="¿Dónde recogemos? (restaurante, tienda...)" />
          <mat-icon matSuffix>store</mat-icon>
        </mat-form-field>

        <!-- Dirección entrega -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección de entrega</mat-label>
          <input matInput formControlName="direccionEntregaSolicitud"
                 placeholder="¿A dónde te lo llevamos?" />
          <mat-icon matSuffix>home</mat-icon>
          @if (form.get('direccionEntregaSolicitud')?.hasError('required') && form.get('direccionEntregaSolicitud')?.touched) {
            <mat-error>La dirección de entrega es requerida</mat-error>
          }
        </mat-form-field>
      </div>

      <div class="dialog-footer">
        <button mat-stroked-button (click)="dialogRef.close(false)">Cancelar</button>
        <button mat-flat-button class="btn-primary" (click)="save()" [disabled]="saving()">
          @if (saving()) { <mat-spinner diameter="18" style="margin-right:6px"/> }
          <mat-icon>send</mat-icon>
          Enviar pedido
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modalidad-selector { display: flex; gap: 10px; margin-bottom: 14px; }
    .modal-btn {
      flex: 1; padding: 12px 8px; border: 2px solid #e0e0e0; border-radius: 8px;
      background: white; cursor: pointer; display: flex; flex-direction: column;
      align-items: center; gap: 4px; font-size: 13px; transition: all .2s;
    }
    .modal-btn:hover { border-color: #90caf9; }
    .modal-btn.active { border-color: #1976d2; background: #e3f2fd; color: #1976d2; }
    .modal-btn mat-icon { font-size: 22px; height: 22px; width: 22px; }
    .modal-name { font-weight: 600; font-size: 13px; }
    .modal-desc { font-size: 11px; color: #757575; }
    /* Express overrides */
    .express-btn { border-color: #ff8f00; background: #fff8e1; }
    .express-btn:hover { border-color: #e65100; background: #fff3e0; }
    .express-btn.active { border-color: #e65100; background: #ffe0b2; color: #bf360c; }
    .express-btn .modal-desc { color: #e65100; font-weight: 500; }
    .express-header { display: flex; align-items: center; gap: 4px; }
    .express-icon { color: #ff6f00; font-size: 26px !important; height: 26px !important; width: 26px !important; }
    .express-label { font-size: 11px; font-weight: 700; letter-spacing: .5px; color: #ff6f00; }
    .cotizacion-box {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px;
      border-radius: 8px; background: #e8f5e9; border: 1px solid #a5d6a7;
      font-size: 13px; margin-bottom: 12px;
    }
    .cotizacion-box.limitada { background: #fff8e1; border-color: #ffe082; }
    .cotizacion-box mat-icon { color: #388e3c; margin-top: 1px; }
    .cotizacion-box.limitada mat-icon { color: #f9a825; }
    .espera-hint { color: #e65100; }
  `],
})
export class PedidoDialogComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(SolicitudService);
  private tipoSvc = inject(TipoMaestraService);
  private auth    = inject(AuthService);
  private snack   = inject(MatSnackBar);
  dialogRef       = inject(MatDialogRef<PedidoDialogComponent>);

  saving      = signal(false);
  servicios   = signal<TipoMaestra[]>([]);
  zonas       = signal<TipoMaestra[]>([]);
  modalidades = signal<TipoMaestra[]>([]);
  cotizacion  = signal<Cotizacion | null>(null);

  form = this.fb.group({
    tipoModalidad:              [null as number | null, Validators.required],
    tipoServicio:               [null as number | null, Validators.required],
    tipoZona:                   [null as number | null, Validators.required],
    descripcionSolicitud:       ['', [Validators.required, Validators.minLength(10)]],
    direccionRecogidaSolicitud: [''],
    direccionEntregaSolicitud:  ['', Validators.required],
  });

  ngOnInit() {
    this.tipoSvc.getAll().subscribe(tipos => {
      const catServicio  = tipos.find(t => t.codigoTipo === 'CAT_SERVICIO');
      const catZona      = tipos.find(t => t.codigoTipo === 'CAT_ZONA');
      const catModalidad = tipos.find(t => t.codigoTipo === 'CAT_MODALIDAD');
      this.servicios.set(tipos.filter(t => t.padreTipo === catServicio?.id));
      this.zonas.set(tipos.filter(t => t.padreTipo === catZona?.id));
      const mods = tipos.filter(t => t.padreTipo === catModalidad?.id);
      this.modalidades.set(mods);
      const estandar = mods.find(m => m.codigoTipo === 'MOD_ESTANDAR');
      if (estandar) this.form.get('tipoModalidad')?.setValue(estandar.id!);
    });

    this.form.get('tipoZona')?.valueChanges.subscribe(id => {
      if (id) {
        this.svc.cotizacion(id).subscribe({
          next: data => this.cotizacion.set(data),
          error: () => this.cotizacion.set(null),
        });
      } else {
        this.cotizacion.set(null);
      }
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const user = this.auth.currentUser();
    if (!user?.entityId) {
      this.snack.open(
        'Tu usuario no está vinculado a un cliente. Contacta al administrador.',
        'Cerrar',
        { duration: 7000, panelClass: 'snack-error' }
      );
      return;
    }

    this.saving.set(true);

    this.tipoSvc.getAll().subscribe(tipos => {
      const pendiente = tipos.find(t => t.codigoTipo === 'PENDIENTE') ?? tipos[0];
      if (!pendiente) {
        this.snack.open('Error al cargar configuración del sistema', 'Cerrar', { duration: 4000 });
        this.saving.set(false);
        return;
      }

      const payload = {
        ...this.form.value,
        cliente: user.entityId,
        tipoEstado: pendiente.id,
        tipoMotivoRechazo: null,
      };

      this.svc.post(payload as any).subscribe({
        next: (sol: any) => {
          const esExpress = this.modalidades().find(m => m.id === this.form.value.tipoModalidad)?.codigoTipo === 'MOD_EXPRESS';
          const msg = sol?.tipoEstadoCodigo === 'RECHAZADA'
            ? 'Pedido recibido pero fue rechazado automáticamente. Revisa los datos.'
            : esExpress
              ? '¡Pedido Express enviado! Se asignará al mejor domiciliario disponible.'
              : '¡Pedido enviado! Un domiciliario lo tomará en breve.';
          this.snack.open(msg, 'OK', { duration: 5000, panelClass: sol?.tipoEstadoCodigo === 'RECHAZADA' ? 'snack-error' : 'snack-success' });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.snack.open(JSON.stringify(err?.error) || 'Error al enviar el pedido', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
        },
      });
    });
  }
}
