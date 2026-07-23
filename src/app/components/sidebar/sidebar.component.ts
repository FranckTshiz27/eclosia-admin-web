import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { APP_MENU, AppMenuItem } from '../../core/permissions/app-menu.config';
import { PermissionService } from '../../core/permissions/permission.service';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  mainMenus: AppMenuItem[] = [];
  footerMenus: AppMenuItem[] = [];
  expandedIds = new Set<string>();

  private subs = new Subscription();

  constructor(
    private readonly sidebarService: SidebarService,
    private readonly permissionService: PermissionService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.sidebarService.isCollapsed$.subscribe((collapsed) => (this.isCollapsed = collapsed))
    );
    this.subs.add(
      this.permissionService.permissions$.subscribe(() => this.refreshMenus())
    );
    this.subs.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => this.syncExpandedMenus(event.urlAfterRedirects))
    );
    this.refreshMenus();
    this.syncExpandedMenus(this.router.url);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleExpanded(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
      return;
    }
    this.expandedIds.add(id);
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  onLinkClick(): void {
    if (window.innerWidth <= 768) {
      this.sidebarService.setCollapsed(true);
    }
  }

  private refreshMenus(): void {
    const filtered = APP_MENU.map((item) => this.filterMenuItem(item)).filter(
      (item): item is AppMenuItem => !!item
    );
    this.mainMenus = filtered.filter((item) => !item.footer);
    this.footerMenus = filtered.filter((item) => item.footer);
  }

  private filterMenuItem(item: AppMenuItem): AppMenuItem | null {
    const children = (item.children ?? [])
      .map((child) => this.filterMenuItem(child))
      .filter((child): child is AppMenuItem => !!child);

    // Sans permission déclarée → masqué. Sinon au moins une permission active.
    const selfAllowed =
      !!item.permissions?.length && this.permissionService.hasAny(...item.permissions);

    if (item.children?.length) {
      // Parent visible seulement s'il a le droit ET au moins un enfant autorisé.
      if (!selfAllowed || !children.length) {
        return null;
      }
      return { ...item, children };
    }

    return selfAllowed ? { ...item, children } : null;
  }

  private syncExpandedMenus(url: string): void {
    const path = url.split('?')[0];
    for (const item of [...this.mainMenus, ...this.footerMenus]) {
      if (!item.children?.length) {
        continue;
      }
      const match = item.children.some((child) => {
        if (!child.route) {
          return false;
        }
        return path === child.route || path.startsWith(`${child.route}/`);
      });
      if (match) {
        this.expandedIds.add(item.id);
      }
    }
  }
}
