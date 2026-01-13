import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, ThemeToggle],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private authService = inject(AuthService);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  onSubmit() {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      return;
    }

    if (!this.acceptTerms) {
      this.authService.error.set('Você precisa aceitar os termos de uso.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.authService.error.set('As senhas não coincidem.');
      return;
    }

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password,
    });
  }
}
