import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomiciliarioService } from '../../core/services/domiciliario.service';
import { Domiciliario } from '../../core/models/domiciliario.model';

@Component({
  selector: 'app-domiciliario-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './domiciliario-dialog.html',
})
export class DomiciliarioDialogComponent {
  private fb      = inject(FormBuilder);
  private service = inject(DomiciliarioService);
  private snack   = inject(MatSnackBar);
  dialogRef       = inject(MatDialogRef<DomiciliarioDialogComponent>);
  data: Domiciliario | null = inject(MAT_DIALOG_DATA);

  isEdit  = !!this.data?.id;
  saving  = false;

  tiposVehiculo = ['Motocicleta', 'Bicicleta', 'Automóvil', 'A pie'];

  form = this.fb.group({
    identificacionDomiciliario: [this.data?.identificacionDomiciliario ?? '', [Validators.required, Validators.pattern(/^\d+$/)]],
    nombresDomiciliario:        [this.data?.nombresDomiciliario ?? '',        [Validators.required, Validators.minLength(2)]],
    apellidosDomiciliario:      [this.data?.apellidosDomiciliario ?? '',      [Validators.required, Validators.minLength(2)]],
    telefonoDomiciliario:       [this.data?.telefonoDomiciliario ?? '',       [Validators.required, Validators.pattern(/^\d+$/)]],
    tipoVehiculoDomiciliario:   [this.data?.tipoVehiculoDomiciliario ?? '',   [Validators.required]],
    placaDomiciliario:          [this.data?.placaDomiciliario ?? '',          [Validators.required, Validators.pattern(/^[A-Za-z]{3}-?[0-9]{2,3}-?[A-Za-z0-9]?$/)]],
  });

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as Domiciliario;
    val.placaDomiciliario = val.placaDomiciliario?.trim().toUpperCase();
    const obs = this.isEdit
      ? this.service.put(this.data!.id!, val)
      : this.service.post(val);
    obs.subscribe({
      next: () => { this.snack.open(this.isEdit ? 'Actualizado' : 'Creado', 'OK', { duration: 3000, panelClass: 'snack-success' }); this.dialogRef.close(true); },
      error: (err) => { this.saving = false; this.snack.open(JSON.stringify(err?.error) || 'Error', 'Cerrar', { duration: 5000, panelClass: 'snack-error' }); }
    });
  }
}
