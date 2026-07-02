import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../../services/sidebar.service';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  isCollapsed = false;
  isAgentsExpanded = false;
  isStudentsExpanded = false;
  isAdminExpanded = false;
  isConfigurationExpanded = false;
  isSettingsExpanded = false;

  constructor(
    private sidebarService: SidebarService,
    private securityService: SecurityService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sidebarService.isCollapsed$.subscribe(
      collapsed => this.isCollapsed = collapsed
    );
    this.syncExpandedMenus(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncExpandedMenus(event.urlAfterRedirects));
  }

  private syncExpandedMenus(url: string): void {
    this.isConfigurationExpanded = url.startsWith('/configuration');
    this.isAdminExpanded = url.startsWith('/admin');
    this.isStudentsExpanded = url.startsWith('/inscriptions') || url.includes('tab=categories-eleves');
    this.isAgentsExpanded = url.startsWith('/agents');
    this.isSettingsExpanded = url.startsWith('/settings');
  }

  canSee(permission: string): boolean {
    if (!permission) return true;
    return this.securityService.hasPermission(permission as any);
  }

  onLinkClick() {
    if (window.innerWidth <= 768) {
      this.sidebarService.setCollapsed(true);
    }
  }
}
