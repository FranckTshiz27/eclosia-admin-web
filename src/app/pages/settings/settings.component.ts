import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { SecurityService, Role, Permission } from '../../services/security.service';
import { SidebarService, MenuItem } from '../../services/sidebar.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  protected readonly Math = Math;
  activeTab: 'general' | 'users' | 'security' | 'audit' = 'security';
  roles: Role[] = [];
  selectedRole: Role | null = null;
  allPermissions: Permission[] = [];
  
  // Role Creation State
  isCreatingRole = false;
  newRoleName = '';
  selectedPermissions: Permission[] = [];
  
  permissionGroups: { title: string, permissions: Permission[] }[] = [
    {
      title: 'Tableau de Bord & Statistiques',
      permissions: ['VIEW_DASHBOARD', 'VIEW_STATS']
    },
    {
      title: 'Gestion des Agents',
      permissions: ['VIEW_AGENTS', 'CREATE_AGENT', 'EDIT_AGENT', 'DELETE_AGENT']
    },
    {
      title: 'Administration & Accès',
      permissions: ['MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ROLES']
    }
  ];

  // Mock users for simulation
  users = [
    { id: '1', name: 'Admin User', email: 'admin@fonctionpublique.cd', role: 'ADMIN', lastLogin: 'Il y a 2h' },
    { id: '2', name: 'Jean Dupont', email: 'jdupont@fonctionpublique.cd', role: 'MANAGER', lastLogin: 'Hier à 14:30' },
    { id: '3', name: 'Marie Kabila', email: 'mkabila@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Le 12/03/2026' },
    { id: '4', name: 'Pierre Loukou', email: 'ploukou@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Le 11/03/2026' },
    { id: '5', name: 'Sarah Bernard', email: 'sbernard@fonctionpublique.cd', role: 'MANAGER', lastLogin: 'Il y a 4h' },
    { id: '6', name: 'Alain Tshimanga', email: 'atshimanga@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Hier à 09:15' },
    { id: '7', name: 'Lucie Mbuyi', email: 'lmbuyi@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Le 10/03/2026' },
    { id: '8', name: 'David Kasongo', email: 'dkasongo@fonctionpublique.cd', role: 'ADMIN', lastLogin: 'Il y a 1h' },
    { id: '9', name: 'Esther Ngoy', email: 'engoy@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Hier à 21:00' },
    { id: '10', name: 'Moïse Katumbi', email: 'mkatumbi@fonctionpublique.cd', role: 'MANAGER', lastLogin: 'Le 11/03/2026' },
    { id: '11', name: 'Felix Tshisekedi', email: 'ftshisekedi@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Aujourd\'hui' },
    { id: '12', name: 'Martin Fayulu', email: 'mfayulu@fonctionpublique.cd', role: 'AGENT', lastLogin: 'Le 09/03/2026' }
  ];

  // Pagination State
  currentPage = 1;
  pageSize = 10;
  
  // User Creation State
  isAddingUser = false;
  newUser = { name: '', email: '', role: 'AGENT' };

  selectedUserForDetails: any = null;

  constructor(
    private securityService: SecurityService,
    private sidebarService: SidebarService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.roles = this.securityService.getAvailableRoles();
    this.selectedRole = this.roles[0];
    this.allPermissions = this.securityService.getAllPermissions();

    // Detect initial tab and handle route changes
    this.updateActiveTabFromRoute();
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveTabFromRoute();
    });
  }

  updateActiveTabFromRoute() {
    const url = this.router.url;
    if (url.includes('/settings/general')) this.activeTab = 'general';
    else if (url.includes('/settings/users')) this.activeTab = 'users';
    else if (url.includes('/settings/security')) this.activeTab = 'security';
    else if (url.includes('/settings/audit')) this.activeTab = 'audit';
  }

  selectTab(tab: any) {
    this.router.navigate(['/settings', tab]);
  }

  getRoleBadgeClass(roleId: string): string {
    switch (roleId) {
      case 'ADMIN': return 'badge-danger';
      case 'MANAGER': return 'badge-warning';
      default: return 'badge-info';
    }
  }

  startCreatingRole() {
    this.isCreatingRole = true;
    this.newRoleName = '';
    this.selectedPermissions = [];
  }

  cancelRoleCreation() {
    this.isCreatingRole = false;
  }

  togglePermission(p: Permission) {
    const index = this.selectedPermissions.indexOf(p);
    if (index > -1) {
      this.selectedPermissions.splice(index, 1);
    } else {
      this.selectedPermissions.push(p);
    }
  }

  isPermissionSelected(p: Permission): boolean {
    return this.selectedPermissions.includes(p);
  }

  saveNewRole() {
    if (!this.newRoleName || this.selectedPermissions.length === 0) return;

    const newRole: Role = {
      id: this.newRoleName.toUpperCase().replace(/\s+/g, '_'),
      name: this.newRoleName,
      permissions: [...this.selectedPermissions]
    };

    this.securityService.addRole(newRole);
    this.roles = this.securityService.getAvailableRoles();
    this.selectedRole = newRole;
    this.isCreatingRole = false;
    this.isCreatingRole = false;
    console.log('New role created:', newRole);
  }

  getPreviewMenu(): any[] {
    const allMenuSources = [
      ...this.sidebarService.getMenu(),
      ...this.sidebarService.getFooterMenu()
    ];

    const preview: any[] = [];

    allMenuSources.forEach(item => {
      // Check if top-level item should be visible
      if (this.canShowInPreview(item)) {
        preview.push({ title: item.title, icon: item.icon });
      }

      // Check sub-items
      if (item.subItems) {
        item.subItems.forEach(sub => {
          if (this.canShowInPreview(sub)) {
            preview.push({ title: sub.title, icon: sub.icon });
          }
        });
      }
    });

    return preview;
  }

  private canShowInPreview(item: any): boolean {
    if (!item.permission) return true;
    return this.selectedPermissions.includes(item.permission as Permission);
  }

  toggleUserDetails(user: any) {
    if (this.selectedUserForDetails?.id === user.id) {
      this.selectedUserForDetails = null;
    } else {
      this.selectedUserForDetails = user;
    }
  }

  getUserPermissions(roleId: string): string[] {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.permissions : [];
  }

  revokeRole(user: any) {
    if (confirm(`Êtes-vous sûr de vouloir révoquer le rôle de ${user.name} ? L'utilisateur perdra tous ses accès.`)) {
      user.role = 'AUCUN';
      this.selectedUserForDetails = null;
      console.log('Role revoked for user:', user.email);
    }
  }

  // Pagination Logic
  get totalPages(): number {
    return Math.ceil(this.users.length / this.pageSize);
  }

  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.users.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.selectedUserForDetails = null; // Close details when changing page
    }
  }

  // User & Access Attribution Logic
  startAddingUser() {
    this.isAddingUser = true;
    this.newUser = { name: '', email: '', role: 'AGENT' };
  }

  cancelAddingUser() {
    this.isAddingUser = false;
  }

  saveNewUser() {
    if (!this.newUser.name || !this.newUser.email) return;

    const userEntry = {
      id: (this.users.length + 1).toString(),
      name: this.newUser.name,
      email: this.newUser.email,
      role: this.newUser.role,
      lastLogin: 'Jamais'
    };

    this.users.unshift(userEntry); // Add to beginning of list
    this.isAddingUser = false;
    this.currentPage = 1; // Go to first page to see new user
    console.log('New user added:', userEntry);
  }

  updateUserRole(user: any, newRoleId: string) {
    user.role = newRoleId;
    console.log(`Role updated for ${user.email} to ${newRoleId}`);
  }
}
