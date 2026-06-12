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
import { SolicitudService } from '../../core/services/solicitud.service';
import { ClienteService } from '../../core/services/cliente.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { Solicitud } from '../../core/models/solicitud.model';
import { Cliente } from '../../core/models/cliente.model';
import { TipoMaestra } from '../../core/models/tipo-maestra.model';

@Component({
  selector: 'app-solicitud-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './solicitud-dialog.html',
})
export class SolicitudDialogComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private service         = inject(SolicitudService);
  private clienteService  = inject(ClienteService);
  private tipoService     = inject(TipoMaestraService);
  private snack           = inject(MatSnackBar);
  dialogRef               = inject(MatDialogRef<SolicitudDialogComponent>);
  data: Solicitud | null  = inject(MAT_DIALOG_DATA);

  isEdit  = !!this.data?.id;
  saving  = false;

  clientes    = signal<Cliente[]>([]);
  tiposMaestra = signal<TipoMaestra[]>([]);

  form = this.fb.group({
    descripcionSolicitud:       [this.data?.descripcionSolicitud ?? '',       [Validators.required, Validators.minLength(10)]],
    direccionRecogidaSolicitud: [this.data?.direccionRecogidaSolicitud ?? '', []],
    direccionEntregaSolicitud:  [this.data?.direccionEntregaSolicitud ?? '',  [Validators.required, Validators.minLength(5)]],
    cliente:                    [this.data?.cliente ?? null,                  [Validators.required]],
    tipoZona:                   [this.data?.tipoZona ?? null,                 [Validators.required]],
    tipoServicio:               [this.data?.tipoServicio ?? null,             [Validators.required]],
    tipoModalidad:              [this.data?.tipoModalidad ?? null,            [Validators.required]],
    tipoEstado:                 [this.data?.tipoEstado ?? null,               []],
    tipoMotivoRechazo:          [this.data?.tipoMotivoRechazo ?? null,        []],
  });

  ngOnInit() {
    forkJoin({
      clientes: this.clienteService.getAll(),
      tipos: this.tipoService.getAll(),
    }).subscribe(({ clientes, tipos }) => {
      this.clientes.set(clientes);
      this.tiposMaestra.set(tipos);
    });
  }

  tiposPorCategoria(codigo: string) {
    const categoria = this.tiposMaestra().find(t => t.codigoTipo === codigo);
    return categoria ? this.tiposMaestra().filter(t => t.padreTipo === categoria.id) : this.tiposMaestra();
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as Solicitud;
    const obs = this.isEdit
      ? this.service.put(this.data!.id!, val)
      : this.service.post(val);
    obs.subscribe({
      next: () => { this.snack.open(this.isEdit ? 'Actualizada' : 'Creada', 'OK', { duration: 3000, panelClass: 'snack-success' }); this.dialogRef.close(true); },
      error: (err) => { this.saving = false; this.snack.open(JSON.stringify(err?.error) || 'Error', 'Cerrar', { duration: 5000, panelClass: 'snack-error' }); }
    });
  }
}
