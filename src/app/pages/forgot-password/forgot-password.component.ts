import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email: string = '';
  isSubmitting: boolean = false;
  isSuccess: boolean = false;

  constructor(private router: Router) {}

  onSubmit() {
    if (!this.email || !this.email.includes('@')) {
      return;
    }

    this.isSubmitting = true;

    // Simulate API call to send recovery email
    setTimeout(() => {
      this.isSubmitting = false;
      this.isSuccess = true;
    }, 1500);
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
