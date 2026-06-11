import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'VIEW_AGENTS'
  | 'CREATE_AGENT'
  | 'EDIT_AGENT'
  | 'DELETE_AGENT'
  | 'VIEW_STATS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private rolesMap: Record<string, Role> = {
    'ADMIN': {
      id: 'ADMIN',
      name: 'Administrateur',
      permissions: [
        'VIEW_DASHBOARD', 'VIEW_AGENTS', 'CREATE_AGENT', 'EDIT_AGENT', 'DELETE_AGENT',
        'VIEW_STATS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ROLES'
      ]
    },
    'MANAGER': {
      id: 'MANAGER',
      name: 'Gestionnaire RH',
      permissions: [
        'VIEW_DASHBOARD', 'VIEW_AGENTS', 'CREATE_AGENT', 'EDIT_AGENT',
        'VIEW_STATS', 'MANAGE_SETTINGS'
      ]
    },
    'AGENT': {
      id: 'AGENT',
      name: 'Agent de Bureau',
      permissions: [
        'VIEW_DASHBOARD', 'VIEW_AGENTS'
      ]
    }
  };

  private rolesSubject = new BehaviorSubject<Role[]>(Object.values(this.rolesMap));
  public roles$ = this.rolesSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Simulate a logged in Admin for development
    this.login('admin@fonctionpublique.cd', 'ADMIN');
  }

  login(email: string, roleId: string = 'ADMIN') {
    const role = this.rolesMap[roleId] || this.rolesMap['AGENT'];
    const user: User = {
      id: '1',
      username: email.split('@')[0],
      email: email,
      role: role
    };
    this.currentUserSubject.next(user);
    console.log('User logged in with role:', role.name);
  }

  logout() {
    this.currentUserSubject.next(null);
  }

  hasPermission(permission: Permission): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    return user.role.permissions.includes(permission);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAvailableRoles(): Role[] {
    return this.rolesSubject.value;
  }

  getAllPermissions(): Permission[] {
    return [
      'VIEW_DASHBOARD',
      'VIEW_AGENTS',
      'CREATE_AGENT',
      'EDIT_AGENT',
      'DELETE_AGENT',
      'VIEW_STATS',
      'MANAGE_SETTINGS',
      'MANAGE_USERS',
      'MANAGE_ROLES'
    ];
  }

  addRole(role: Role) {
    this.rolesMap[role.id] = role;
    this.rolesSubject.next(Object.values(this.rolesMap));
  }
}
