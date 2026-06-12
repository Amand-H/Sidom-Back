import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-resolver-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding:8px">
      <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px">
        <mat-icon>build</mat-icon> Resolver Novedad
      </h2>
      <mat-dialog-content>
        <p style="color:#555;font-size:13px;margin-bottom:12px">{{ data.descripcion }}</p>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Solución aplicada</mat-label>
          <textarea matInput [(ngModel)]="solucion" rows="4"
            placeholder="Describe la solución con detalle (mín. 10 caracteres)..."></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="dialogRef.close(null)">Cancelar</button>
        <button mat-flat-button color="primary" [disabled]="solucion.length < 10" (click)="confirmar()">
          <mat-icon>check</mat-icon> Confirmar
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class ResolverDialogComponent {
  dialogRef = inject(MatDialogRef<ResolverDialogComponent>);
  data      = inject(MAT_DIALOG_DATA) as { noveId: number; descripcion: string };
  solucion  = '';

  confirmar() { this.dialogRef.close(this.solucion); }
}
