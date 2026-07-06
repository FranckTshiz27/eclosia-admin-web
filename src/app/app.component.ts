import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { SidebarService } from './services/sidebar.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { InactivityService } from './services/inactivity.service';

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
    private sidebarService: SidebarService,
    private router: Router,
    private inactivityService: InactivityService // On injecte le service ici pour l'activer
  ) {}

  ngOnInit() {
    this.sidebarService.isCollapsed$.subscribe(
      collapsed => this.isSidebarCollapsed = collapsed
    );

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.showLayout = !url.includes('/login') && !url.includes('/mfa') && !url.includes('/forgot-password') && !url.includes('fipix-docs');
    });
  }

  closeSidebar() {
    this.sidebarService.setCollapsed(true);
  }
}
