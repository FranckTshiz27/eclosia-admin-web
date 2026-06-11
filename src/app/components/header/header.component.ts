import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isProfileActive = false;
  userAvatar = 'https://ui-avatars.com/api/?name=Ronnie+Woodkin&background=random';
  isDarkMode$: any;

  constructor(
    private sidebarService: SidebarService,
    public themeService: ThemeService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleProfile() {
    this.isProfileActive = !this.isProfileActive;
  }
// ... rest of component

  onPhotoUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.userAvatar = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerPhotoUpload() {
    document.getElementById('photo-upload')?.click();
  }
}
