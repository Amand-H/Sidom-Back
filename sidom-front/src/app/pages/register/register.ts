import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading  = signal(false);
  error    = signal('');
  showPass = signal(false);
  rol      = signal<'CLIENTE' | 'DOMICILIARIO' | ''>('');

  // Campos comunes
  base = this.fb.group({
    rol:      ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // Campos cliente
  clienteForm = this.fb.group({
    identificacionCliente: ['', Validators.required],
    nombresCliente:        ['', [Validators.required, Validators.minLength(3)]],
    apellidosCliente:      ['', [Validators.required, Validators.minLength(3)]],
    telefonoCliente:       ['', Validators.required],
    correoCliente:         ['', [Validators.required, Validators.email]],
    direccionCliente:      ['', Validators.required],
  });

  // Campos domiciliario
  domForm = this.fb.group({
    identificacionDomiciliario: ['', Validators.required],
    nombresDomiciliario:        ['', [Validators.required, Validators.minLength(3)]],
    apellidosDomiciliario:      ['', [Validators.required, Validators.minLength(3)]],
    telefonoDomiciliario:       ['', Validators.required],
    tipoVehiculoDomiciliario:   ['', Validators.required],
    placaDomiciliario:          ['', Validators.required],
  });

  onRolChange(value: string) {
    this.rol.set(value as 'CLIENTE' | 'DOMICILIARIO');
    this.error.set('');
  }

  isInvalid(): boolean {
    if (this.base.invalid) return true;
    if (this.rol() === 'CLIENTE')      return this.clienteForm.invalid;
    if (this.rol() === 'DOMICILIARIO') return this.domForm.invalid;
    return true;
  }

  register() {
    this.base.markAllAsTouched();
    if (this.rol() === 'CLIENTE')      this.clienteForm.markAllAsTouched();
    if (this.rol() === 'DOMICILIARIO') this.domForm.markAllAsTouched();
    if (this.isInvalid()) return;

    this.loading.set(true);
    this.error.set('');

    const payload: Record<string, any> = {
      rol:      this.base.value.rol,
      username: this.base.value.username,
      password: this.base.value.password,
      ...(this.rol() === 'CLIENTE'      ? this.clienteForm.value : {}),
      ...(this.rol() === 'DOMICILIARIO' ? this.domForm.value    : {}),
    };

    this.auth.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.rol() === 'CLIENTE' ? '/inicio' : '/asignaciones']);
      },
      error: (msg: string) => {
        this.loading.set(false);
        this.error.set(msg);
      },
    });
  }
}
