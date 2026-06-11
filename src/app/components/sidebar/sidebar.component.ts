import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService, MenuItem } from '../../services/sidebar.service';
import { SecurityService, Permission } from '../../services/security.service';

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
  isAdminExpanded = false;
  isSettingsExpanded = false;

  constructor(
    private sidebarService: SidebarService,
    private securityService: SecurityService
  ) {}

  ngOnInit() {
    this.sidebarService.isCollapsed$.subscribe(
      collapsed => this.isCollapsed = collapsed
    );
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
