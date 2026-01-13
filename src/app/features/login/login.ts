import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, ThemeToggle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);

  email = '';
  password = '';
  rememberMe = false;

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  onSubmit() {
    if (!this.email || !this.password) {
      return;
    }

    this.authService.login({
      email: this.email,
      password: this.password
    });
  }
}
