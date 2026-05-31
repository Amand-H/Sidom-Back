import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';
import { ClienteService } from '../../core/services/cliente.service';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { Cliente } from '../../core/models/cliente.model';
import { Domiciliario } from '../../core/models/domiciliario.model';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatSelectModule,
  ],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css',
})
export class MiPerfilComponent implements OnInit {
  private fb         = inject(FormBuilder);
  private authSvc    = inject(AuthService);
  private clienteSvc = inject(ClienteService);
  private domSvc     = inject(DomiciliarioService);
  private snack      = inject(MatSnackBar);

  user     = this.authSvc.currentUser;
  loading  = signal(true);
  saving   = signal(false);
  savingPwd = signal(false);
  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  // Formulario info personal (se rellena al cargar)
  infoForm = this.fb.group({
    nombres:       ['', [Validators.required, Validators.minLength(3)]],
    apellidos:     ['', [Validators.required, Validators.minLength(3)]],
    telefono:      ['', Validators.required],
    correo:        ['', [Validators.email]],
    direccion:     [''],
    identificacion:[''],
    tipoVehiculo:  [''],
    placa:         [''],
  });

  pwdForm = this.fb.group({
    passwordActual:  ['', Validators.required],
    passwordNuevo:   ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', Validators.required],
  });

  private clienteId: number | null = null;
  private domiciliarioId: number | null = null;

  ngOnInit() {
    const user = this.authSvc.currentUser();
    if (!user?.entityId) { this.loading.set(false); return; }

    if (user.role === 'CLIENTE') {
      this.clienteId = user.entityId;
      this.clienteSvc.getById(user.entityId).subscribe({
        next: c => { this.patchCliente(c); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (user.role === 'DOMICILIARIO') {
      this.domiciliarioId = user.entityId;
      this.domSvc.getById(user.entityId).subscribe({
        next: d => { this.patchDomiciliario(d); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  private patchCliente(c: Cliente) {
    this.infoForm.patchValue({
      identificacion: c.identificacionCliente,
      nombres:        c.nombresCliente,
      apellidos:      c.apellidosCliente,
      telefono:       c.telefonoCliente,
      correo:         c.correoCliente,
      direccion:      c.direccionCliente,
    });
  }

  private patchDomiciliario(d: Domiciliario) {
    this.infoForm.patchValue({
      identificacion: d.identificacionDomiciliario,
      nombres:        d.nombresDomiciliario,
      apellidos:      d.apellidosDomiciliario,
      telefono:       d.telefonoDomiciliario,
      tipoVehiculo:   d.tipoVehiculoDomiciliario,
      placa:          d.placaDomiciliario,
    });
  }

  guardarInfo() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.infoForm.value;
    const role = this.user()?.role;

    if (role === 'CLIENTE' && this.clienteId) {
      this.clienteSvc.patch(this.clienteId, {
        nombresCliente:   v.nombres!,
        apellidosCliente: v.apellidos!,
        telefonoCliente:  v.telefono!,
        correoCliente:    v.correo!,
        direccionCliente: v.direccion!,
      }).subscribe({
        next: c => {
          this.patchCliente(c);
          this.snack.open('Información actualizada', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.saving.set(false);
          // Actualizar nombre en el estado de auth
          this.authSvc.currentUser.update(u => u ? ({ ...u, name: `${c.nombresCliente} ${c.apellidosCliente}` }) : u);
        },
        error: err => {
          this.saving.set(false);
          this.snack.open(JSON.stringify(err?.error) || 'Error al guardar', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
        },
      });
    } else if (role === 'DOMICILIARIO' && this.domiciliarioId) {
      this.domSvc.patch(this.domiciliarioId, {
        nombresDomiciliario:      v.nombres!,
        apellidosDomiciliario:    v.apellidos!,
        telefonoDomiciliario:     v.telefono!,
        tipoVehiculoDomiciliario: v.tipoVehiculo!,
        placaDomiciliario:        v.placa!,
      }).subscribe({
        next: d => {
          this.patchDomiciliario(d);
          this.snack.open('Información actualizada', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.saving.set(false);
          this.authSvc.currentUser.update(u => u ? ({ ...u, name: `${d.nombresDomiciliario} ${d.apellidosDomiciliario}` }) : u);
        },
        error: err => {
          this.saving.set(false);
          this.snack.open(JSON.stringify(err?.error) || 'Error al guardar', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
        },
      });
    }
  }

  cambiarPassword() {
    const f = this.pwdForm.value;
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    if (f.passwordNuevo !== f.passwordConfirm) {
      this.snack.open('Las contraseñas nuevas no coinciden', 'Cerrar', { duration: 3000, panelClass: 'snack-error' });
      return;
    }
    this.savingPwd.set(true);
    this.authSvc.cambiarPassword(f.passwordActual!, f.passwordNuevo!).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwdForm.reset();
        this.snack.open('Contraseña cambiada exitosamente', 'OK', { duration: 4000, panelClass: 'snack-success' });
      },
      error: err => {
        this.savingPwd.set(false);
        this.snack.open(err?.error?.error || 'Error al cambiar contraseña', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }
}
