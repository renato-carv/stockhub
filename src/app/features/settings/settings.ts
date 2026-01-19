import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService, UpdateUserDto, UpdatePasswordDto } from '../../core/services/user.service';
import { OrganizationService } from '../../core/services/organization.service';
import { TeamService } from '../../core/services/team.service';
import { SetupRequired } from '../../shared/components/setup-required/setup-required';

type SettingsTab = 'profile' | 'password';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SetupRequired],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  protected authService = inject(AuthService);
  protected userService = inject(UserService);
  protected organizationService = inject(OrganizationService);
  protected teamService = inject(TeamService);

  activeTab = signal<SettingsTab>('profile');

  // Profile form
  profileName = signal('');
  profileEmail = signal('');

  // Avatar
  avatarPreview = signal<string | null>(null);
  avatarError = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // Password form
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Computed
  isSetupComplete = computed(() => {
    return this.organizationService.organizations().length > 0 &&
           this.teamService.teams().length > 0;
  });

  passwordsMatch = computed(() => {
    return this.newPassword() === this.confirmPassword();
  });

  isPasswordValid = computed(() => {
    const password = this.newPassword();
    if (password.length < 8) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[@$!%*?&]/.test(password)) return false;
    return true;
  });

  canSubmitPassword = computed(() => {
    return this.currentPassword().length > 0 &&
           this.newPassword().length > 0 &&
           this.confirmPassword().length > 0 &&
           this.passwordsMatch() &&
           this.isPasswordValid() &&
           !this.userService.isLoading();
  });

  canSubmitProfile = computed(() => {
    const user = this.authService.user();
    const nameChanged = this.profileName() !== user?.name;
    const hasAvatar = this.selectedFile() !== null;
    return (nameChanged || hasAvatar) &&
           this.profileName().length >= 3 &&
           !this.userService.isLoading();
  });

  ngOnInit(): void {
    const user = this.authService.user();
    if (user) {
      this.profileName.set(user.name);
      this.profileEmail.set(user.email);
    }
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.userService.clearMessages();
  }

  updateProfile(): void {
    const user = this.authService.user();
    if (!user) return;

    const data: UpdateUserDto = {};

    if (this.profileName() !== user.name) {
      data.name = this.profileName();
    }
    if (this.profileEmail() !== user.email) {
      data.email = this.profileEmail();
    }

    this.userService.updateProfile(user.id, data).subscribe({
      next: (updatedUser) => {
        this.authService.user.set({
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
        });
      },
    });
  }

  updatePassword(): void {
    const user = this.authService.user();
    if (!user) return;

    const data: UpdatePasswordDto = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    };

    this.userService.updatePassword(user.id, data).subscribe({
      next: () => {
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
    });
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword.update(v => !v);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const maxSize = 2 * 1024 * 1024; // 2MB

    this.avatarError.set(null);

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      this.avatarError.set('Formato inválido. Use JPG, PNG ou GIF.');
      input.value = '';
      return;
    }

    if (file.size > maxSize) {
      this.avatarError.set('Arquivo muito grande. Tamanho máximo: 2MB.');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input value to allow selecting the same file again
    input.value = '';
  }

  removeAvatar(): void {
    this.avatarPreview.set(null);
    this.selectedFile.set(null);
    this.avatarError.set(null);
  }

  getPasswordStrength(): { label: string; class: string; width: string } {
    const password = this.newPassword();
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    if (strength <= 2) return { label: 'Fraca', class: 'weak', width: '33%' };
    if (strength <= 4) return { label: 'Média', class: 'medium', width: '66%' };
    return { label: 'Forte', class: 'strong', width: '100%' };
  }
}
