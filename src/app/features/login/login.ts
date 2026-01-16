import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { AuthService } from '../../core/services/auth.service';

const REMEMBER_ME_KEY = 'stockhub_remember_me';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, ThemeToggle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private authService = inject(AuthService);

  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  ngOnInit(): void {
    const savedCredentials = localStorage.getItem(REMEMBER_ME_KEY);
    if (savedCredentials) {
      try {
        const { email, password } = JSON.parse(atob(savedCredentials));
        this.email = email;
        this.password = password;
        this.rememberMe = true;
      } catch {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.email || !this.password) {
      return;
    }

    if (this.rememberMe) {
      const credentials = btoa(JSON.stringify({ email: this.email, password: this.password }));
      localStorage.setItem(REMEMBER_ME_KEY, credentials);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    this.authService.login({
      email: this.email,
      password: this.password,
    });
  }
}
