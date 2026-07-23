import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { SidebarService } from './services/sidebar.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { InactivityService } from './services/inactivity.service';
import { SecurityService } from './services/security.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'fp-career-app';
  isSidebarCollapsed = false;
  showLayout = true;

  constructor(
    private readonly sidebarService: SidebarService,
    private readonly router: Router,
    private readonly inactivityService: InactivityService,
    private readonly securityService: SecurityService
  ) {}

  ngOnInit(): void {
    this.sidebarService.isCollapsed$.subscribe(
      (collapsed) => (this.isSidebarCollapsed = collapsed)
    );

    if (this.securityService.getAccessToken()) {
      this.securityService.loadCurrentUser().subscribe();
    }

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        this.showLayout =
          !url.includes('/login') &&
          !url.includes('/forgot-password') &&
          !url.includes('fipix-docs');
      });
  }

  closeSidebar(): void {
    this.sidebarService.setCollapsed(true);
  }
}
