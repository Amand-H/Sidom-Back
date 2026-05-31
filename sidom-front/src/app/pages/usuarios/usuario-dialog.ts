import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { UsuarioService } from '../../core/services/usuario.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { ClienteService } from '../../core/services/cliente.service';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { Usuario } from '../../core/models/usuario.model';
import { TipoMaestra } from '../../core/models/tipo-maestra.model';
import { Cliente } from '../../core/models/cliente.model';
import { Domiciliario } from '../../core/models/domiciliario.model';

@Component({
  selector: 'app-usuario-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './usuario-dialog.html',
})
export class UsuarioDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UsuarioService);
  private tipoSvc = inject(TipoMaestraService);
  private clienteSvc = inject(ClienteService);
  private domiciliarioSvc = inject(DomiciliarioService);
  private snack = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<UsuarioDialogComponent>);
  data: Usuario | null = inject(MAT_DIALOG_DATA);

  isEdit = !!this.data?.id;
  saving = false;

  roles = signal<TipoMaestra[]>([]);
  clientes = signal<Cliente[]>([]);
  domiciliarios = signal<Domiciliario[]>([]);

  form = this.fb.group({
    usernameUsuario: [this.data?.usernameUsuario ?? '', [Validators.required, Validators.minLength(4)]],
    passwordUsuario: ['', this.isEdit ? [] : [Validators.required, Validators.minLength(8)]],
    activoUsuario: [this.data?.activoUsuario ?? true, [Validators.required]],
    tipoRol: [this.data?.tipoRol ?? null, [Validators.required]],
    cliente: [this.data?.cliente ?? null],
    domiciliario: [this.data?.domiciliario ?? null],
  });

  ngOnInit() {
    forkJoin({
      tipos: this.tipoSvc.getAll(),
      clientes: this.clienteSvc.getAll(),
      domiciliarios: this.domiciliarioSvc.getAll(),
    }).subscribe(({ tipos, clientes, domiciliarios }) => {
      const rolPadre = tipos.find(t => t.codigoTipo === 'CAT_ROL');
      this.roles.set(rolPadre ? tipos.filter(t => t.padreTipo === rolPadre.id) : tipos);
      this.clientes.set(clientes);
      this.domiciliarios.set(domiciliarios);
    });
  }

  private rolSeleccionadoCodigo(): string {
    const roleId = this.form.value.tipoRol;
    return this.roles().find(r => r.id === roleId)?.codigoTipo || '';
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val = this.form.value as Usuario;

    const rolCodigo = this.rolSeleccionadoCodigo();
    if (rolCodigo === 'ROL_CLIENTE' && !val.cliente) {
      this.snack.open('Un usuario CLIENTE debe estar vinculado a un cliente', 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
      return;
    }
    if (rolCodigo === 'ROL_DOMI' && !val.domiciliario) {
      this.snack.open('Un usuario DOMICILIARIO debe estar vinculado a un domiciliario', 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
      return;
    }
    if (rolCodigo === 'ROL_ADMIN') {
      val.cliente = null;
      val.domiciliario = null;
    }

    this.saving = true;
    if (!val.passwordUsuario) delete val.passwordUsuario;
    const obs = this.isEdit ? this.service.put(this.data!.id!, val) : this.service.post(val);
    obs.subscribe({
      next: () => {
        this.snack.open(this.isEdit ? 'Usuario actualizado' : 'Usuario creado', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(JSON.stringify(err?.error) || 'Error al guardar', 'Cerrar', { duration: 5000, panelClass: 'snack-error' });
      },
    });
  }
}
