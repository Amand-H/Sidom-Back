import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  loading  = signal(false);
  error    = signal('');
  showPass = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  login() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    const { username, password } = this.form.value;
    this.auth.login(username!, password!).subscribe({
      next: (user) => {
        this.loading.set(false);
        const target = user.role === 'CLIENTE'
          ? '/inicio'
          : user.role === 'DOMICILIARIO'
            ? '/asignaciones'
            : '/dashboard';
        this.router.navigate([target]);
      },
      error: (msg) => {
        this.loading.set(false);
        this.error.set(typeof msg === 'string' ? msg : 'Usuario o contraseña incorrectos');
      },
    });
  }
}
