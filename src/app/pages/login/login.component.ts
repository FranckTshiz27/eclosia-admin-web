import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { canAccessUrl, resolveHomeUrl } from '../../core/permissions/permission-navigation';
import { PermissionService } from '../../core/permissions/permission.service';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginData = {
    username: '',
    password: ''
  };

  changePasswordData = {
    newPassword: '',
    confirmPassword: ''
  };

  isLoading = false;
  errorMessage = '';
  infoMessage = '';
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  /** Affiche le formulaire de 1ère connexion (mot de passe temporaire). */
  passwordChangeRequired = false;
  pendingUsername = '';
  private temporaryPassword = '';
  private returnUrl: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly securityService: SecurityService,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && !returnUrl.startsWith('/login') && !returnUrl.startsWith('/forbidden')) {
      this.returnUrl = returnUrl;
    }

    if (this.securityService.isAuthenticated()) {
      this.navigateAfterAuth();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  backToLogin(): void {
    this.passwordChangeRequired = false;
    this.temporaryPassword = '';
    this.pendingUsername = '';
    this.changePasswordData = { newPassword: '', confirmPassword: '' };
    this.loginData.password = '';
    this.errorMessage = '';
    this.infoMessage = '';
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  onLogin(): void {
    this.errorMessage = '';
    this.infoMessage = '';
    const username = this.loginData.username.trim();
    const password = this.loginData.password;

    if (!username || !password || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.securityService.login(username, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.navigateAfterAuth();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        if (this.isPasswordChangeRequired(err)) {
          this.openPasswordChangeForm(username, password, err);
          return;
        }
        this.errorMessage = extractApiErrorMessage(
          err,
          'Identifiant ou mot de passe incorrect.'
        );
      }
    });
  }

  onCompleteTemporaryPassword(): void {
    this.errorMessage = '';
    this.infoMessage = '';

    const newPassword = this.changePasswordData.newPassword;
    const confirmPassword = this.changePasswordData.confirmPassword;

    if (!this.pendingUsername || !this.temporaryPassword || this.isLoading) {
      return;
    }

    if (newPassword.length < 8) {
      this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (newPassword === this.temporaryPassword) {
      this.errorMessage = 'Le nouveau mot de passe doit être différent du mot de passe temporaire.';
      return;
    }

    this.isLoading = true;
    this.securityService
      .completeTemporaryPassword(this.pendingUsername, this.temporaryPassword, newPassword)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.navigateAfterAuth();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = extractApiErrorMessage(
            err,
            'Impossible de définir le nouveau mot de passe.'
          );
        }
      });
  }

  private navigateAfterAuth(): void {
    const requested = this.returnUrl;
    if (requested && canAccessUrl(requested, this.permissionService)) {
      this.router.navigateByUrl(requested);
      return;
    }
    this.router.navigateByUrl(resolveHomeUrl(this.permissionService));
  }

  private openPasswordChangeForm(username: string, temporaryPassword: string, err: unknown): void {
    const bodyUsername = this.readErrorUsername(err);
    this.pendingUsername = (bodyUsername || username).trim();
    this.temporaryPassword = temporaryPassword;
    this.passwordChangeRequired = true;
    this.loginData = { username: '', password: '' };
    this.changePasswordData = { newPassword: '', confirmPassword: '' };
    this.showPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.errorMessage = '';
    this.infoMessage =
      'Un changement de mot de passe est requis pour votre première connexion. Choisissez un nouveau mot de passe.';
  }

  private isPasswordChangeRequired(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) {
      const maybe = err as { status?: number; error?: { code?: string } };
      return maybe?.status === 403 && maybe?.error?.code === 'PASSWORD_CHANGE_REQUIRED';
    }
    const code = (err.error as { code?: string } | null)?.code;
    return err.status === 403 && code === 'PASSWORD_CHANGE_REQUIRED';
  }

  private readErrorUsername(err: unknown): string {
    const body =
      err instanceof HttpErrorResponse
        ? (err.error as { username?: string } | null)
        : ((err as { error?: { username?: string } })?.error ?? null);
    return String(body?.username ?? '').trim();
  }
}
