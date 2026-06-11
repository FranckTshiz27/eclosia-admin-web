import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SecurityService, Permission } from './security.service';

export interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  permission?: Permission;
  expanded?: boolean;
  subItems?: { title: string; route: string; icon: string; permission?: Permission }[];
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsedSubject = new BehaviorSubject<boolean>(false);
  isCollapsed$ = this.isCollapsedSubject.asObservable();

  private menuItems: MenuItem[] = [
    {
      title: 'TABLEAU DE BORD',
      icon: 'bi-speedometer2',
      route: '/dashboard',
      permission: 'VIEW_DASHBOARD'
    },
    {
      title: 'GESTION AGENTS',
      icon: 'bi-people',
      permission: 'VIEW_AGENTS',
      expanded: false,
      subItems: [
        { title: 'Creer un agent', route: '/agents/create', icon: 'bi-person-plus', permission: 'CREATE_AGENT' },
        { title: 'Liste des agents', route: '/agents/list', icon: 'bi-person-lines-fill', permission: 'VIEW_AGENTS' }
      ]
    },
    {
      title: 'STATISTIQUE DES AGENTS',
      icon: 'bi-bar-chart-line',
      route: '/statistics',
      permission: 'VIEW_STATS'
    }
  ];

  private footerMenuItems: MenuItem[] = [
    {
      title: 'GESTION DES ACCES',
      icon: 'bi-gear',
      permission: 'MANAGE_SETTINGS',
      expanded: false,
      subItems: [
        { title: 'Général', route: '/settings/general', icon: 'bi-sliders', permission: 'MANAGE_SETTINGS' },
        { title: 'Utilisateurs', route: '/settings/users', icon: 'bi-person-badge', permission: 'MANAGE_USERS' },
        { title: 'Sécurité', route: '/settings/security', icon: 'bi-shield-lock', permission: 'MANAGE_ROLES' },
        { title: 'Audit logs', route: '/settings/audit', icon: 'bi-journal-text', permission: 'MANAGE_SETTINGS' }
      ]
    }
  ];

  toggleSidebar() {
    this.isCollapsedSubject.next(!this.isCollapsedSubject.value);
  }

  setCollapsed(value: boolean) {
    this.isCollapsedSubject.next(value);
  }

  getMenu(): MenuItem[] {
    return this.menuItems;
  }

  getFooterMenu(): MenuItem[] {
    return this.footerMenuItems;
  }
}
