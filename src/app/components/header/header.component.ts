import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';
import { SecurityService, User } from '../../services/security.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  isProfileActive = false;
  userAvatar = 'https://ui-avatars.com/api/?name=User&background=random';
  userName = 'Utilisateur';
  userRoleLabel = '—';
  isDarkMode$: any;
  private userSub?: Subscription;

  constructor(
    private readonly sidebarService: SidebarService,
    public readonly themeService: ThemeService,
    private readonly securityService: SecurityService,
    private readonly router: Router
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit(): void {
    this.userSub = this.securityService.currentUser$.subscribe((user) => this.applyUser(user));
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleProfile(): void {
    this.isProfileActive = !this.isProfileActive;
  }

  logout(): void {
    this.isProfileActive = false;
    this.securityService.logout(true);
    this.router.navigate(['/login']);
  }

  onPhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.userAvatar = String(e.target?.result ?? this.userAvatar);
    };
    reader.readAsDataURL(file);
  }

  triggerPhotoUpload(): void {
    document.getElementById('photo-upload')?.click();
  }

  private applyUser(user: User | null): void {
    if (!user) {
      this.userName = 'Utilisateur';
      this.userRoleLabel = '—';
      this.userAvatar = 'https://ui-avatars.com/api/?name=User&background=random';
      return;
    }

    this.userName = user.fullName || user.username;
    this.userRoleLabel = user.role?.name || user.roles[0]?.name || 'Utilisateur';
    const avatarName = encodeURIComponent(this.userName);
    this.userAvatar = `https://ui-avatars.com/api/?name=${avatarName}&background=random`;
  }
}
