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
import { EntregaService } from '../../core/services/entrega.service';
import { TipoMaestraService } from '../../core/services/tipo-maestra.service';
import { TipoMaestra } from '../../core/models/tipo-maestra.model';

@Component({
  selector: 'app-novedad-rapida-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <span class="material-icons" style="color:#e65100">report_problem</span>
        <div><h2>Reportar incidencia</h2><p>Informa un problema en la entrega</p></div>
        <button mat-icon-button (click)="ref.close(false)"><mat-icon>close</mat-icon></button>
      </div>
      <div class="dialog-body" [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de incidencia</mat-label>
          <mat-select formControlName="tipoNovedad">
            @for (t of tiposNovedad(); track t.id) {
              <mat-option [value]="t.id">{{ t.nombreTipo }}</mat-option>
            }
          </mat-select>
          @if (form.get('tipoNovedad')?.hasError('required') && form.get('tipoNovedad')?.touched) {
            <mat-error>Selecciona un tipo</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcionNovedad" rows="3"
                    placeholder="Describe la situación con detalle..."></textarea>
          @if (form.get('descripcionNovedad')?.invalid && form.get('descripcionNovedad')?.touched) {
            <mat-error>Mínimo 10 caracteres</mat-error>
          }
        </mat-form-field>
      </div>
      <div class="dialog-footer">
        <button mat-stroked-button (click)="ref.close(false)">Cancelar</button>
        <button mat-flat-button style="background:#e65100;color:#fff;border-radius:10px"
                (click)="save()" [disabled]="saving()">
          @if (saving()) { <mat-spinner diameter="16"/> }
          <mat-icon>send</mat-icon> Reportar
        </button>
      </div>
    </div>
  `,
})
export class NovedadRapidaDialogComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(EntregaService);
  private tipoSvc = inject(TipoMaestraService);
  private snack   = inject(MatSnackBar);
  data            = inject(MAT_DIALOG_DATA) as { seguimientoId: number };
  ref             = inject(MatDialogRef<NovedadRapidaDialogComponent>);

  saving       = signal(false);
  tiposNovedad = signal<TipoMaestra[]>([]);

  form = this.fb.group({
    tipoNovedad:        [null as number | null, Validators.required],
    descripcionNovedad: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit() {
    this.tipoSvc.getAll().subscribe(tipos => {
      const cat = tipos.find(t => t.codigoTipo === 'CAT_NOVEDAD');
      // Exclude RESUELTA — that's the resolution state, not a report type
      this.tiposNovedad.set(tipos.filter(t => t.padreTipo === cat?.id && t.codigoTipo !== 'RESUELTA'));
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const tipoId = this.form.value.tipoNovedad!;
    this.svc.postNovedad({
      seguimientoEntrega: this.data.seguimientoId,
      tipoNovedad:        tipoId,
      tipoEstado:         tipoId,   // estado inicial = mismo tipo (admin lo resuelve)
      descripcionNovedad: this.form.value.descripcionNovedad!,
    } as any).subscribe({
      next: () => {
        this.snack.open('Incidencia reportada', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.ref.close(true);
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(JSON.stringify(err?.error) || 'Error al reportar', 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
      },
    });
  }
}
