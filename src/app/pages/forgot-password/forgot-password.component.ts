import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  username = '';
  isSubmitting = false;
  isSuccess = false;
  errorMessage = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  onSubmit(): void {
    const username = this.username.trim();
    if (!username || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.forgotPassword({ username }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isSubmitting = false;
        // Ne pas révéler si le compte existe : message générique en succès UX,
        // sauf erreur technique claire.
        const status = (err as { status?: number })?.status;
        if (status === 0 || (status && status >= 500)) {
          this.errorMessage = extractApiErrorMessage(
            err,
            'Impossible d’envoyer la demande pour le moment.'
          );
          return;
        }
        this.isSuccess = true;
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
