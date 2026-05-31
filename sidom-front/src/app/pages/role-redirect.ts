import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  template: '',
})
export class RoleRedirectComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    const role = this.auth.currentUser()?.role;
    const target = role === 'CLIENTE'
      ? '/inicio'
      : role === 'DOMICILIARIO'
        ? '/asignaciones'
        : '/dashboard';
    this.router.navigateByUrl(target);
  }
}
