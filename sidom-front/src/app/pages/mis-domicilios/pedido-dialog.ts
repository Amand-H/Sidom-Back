import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { SolicitudService } from '../../core/services/solicitud.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { AuthService } from '../../core/services/auth.service';
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
})
export class PedidoDialogComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(SolicitudService);
  private tipoSvc = inject(TipoMaestraService);
  private auth    = inject(AuthService);
  private snack   = inject(MatSnackBar);
  dialogRef       = inject(MatDialogRef<PedidoDialogComponent>);

  saving   = signal(false);
  servicios = signal<TipoMaestra[]>([]);
  zonas     = signal<TipoMaestra[]>([]);

  form = this.fb.group({
    tipoServicio:               [null as number | null, Validators.required],
    tipoZona:                   [null as number | null, Validators.required],
    descripcionSolicitud:       ['', [Validators.required, Validators.minLength(10)]],
    direccionRecogidaSolicitud: [''],
    direccionEntregaSolicitud:  ['', Validators.required],
  });

  ngOnInit() {
    this.tipoSvc.getAll().subscribe(tipos => {
      const catServicio = tipos.find(t => t.codigoTipo === 'CAT_SERVICIO');
      const catZona     = tipos.find(t => t.codigoTipo === 'CAT_ZONA');
      this.servicios.set(tipos.filter(t => t.padreTipo === catServicio?.id));
      this.zonas.set(tipos.filter(t => t.padreTipo === catZona?.id));
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const user = this.auth.currentUser();
    if (!user?.entityId) {
      this.snack.open(
        'Tu usuario cliente no está vinculado a un registro de cliente. Cierra sesión, vuelve a entrar o pide al administrador que corrija el vínculo.',
        'Cerrar',
        { duration: 7000, panelClass: 'snack-error' }
      );
      return;
    }

    this.saving.set(true);

    // El backend asigna y valida el estado automáticamente al crear.
    // Solo necesitamos pasar un tipoEstado válido como placeholder (PENDIENTE).
    // Usamos el primer tipo disponible con código PENDIENTE, o el primer tipo de la lista.
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
          const msg = sol?.tipoEstadoCodigo === 'RECHAZADA'
            ? 'Pedido recibido pero fue rechazado automáticamente. Revisa los datos.'
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
