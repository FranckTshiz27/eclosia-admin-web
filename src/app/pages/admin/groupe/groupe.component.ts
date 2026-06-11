import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface GroupItem {
  initials: string;
  avatarClass: string;
  name: string;
  schools: number;
  email: string;
  phone: string;
  status: 'Actif' | 'Inactif';
  createdAt: string;
}

@Component({
  selector: 'app-groupe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './groupe.component.html',
  styleUrl: './groupe.component.css'
})
export class GroupeComponent {
  isCreateModalOpen = false;

  groups: GroupItem[] = [
    { initials: 'GC', avatarClass: 'avatar-blue', name: 'Groupe Catholique', schools: 5, email: 'contact@gc.cd', phone: '+243 810 000 001', status: 'Actif', createdAt: '12 janv. 2024' },
    { initials: 'GP', avatarClass: 'avatar-green', name: 'Groupe Protestant', schools: 3, email: 'contact@gp.cd', phone: '+243 810 000 002', status: 'Actif', createdAt: '15 fevr. 2024' },
    { initials: 'GE', avatarClass: 'avatar-purple', name: 'Groupe Evangelique', schools: 2, email: 'contact@ge.cd', phone: '+243 810 000 003', status: 'Actif', createdAt: '10 mars 2024' },
    { initials: 'GL', avatarClass: 'avatar-orange', name: 'Groupe Laique', schools: 4, email: 'contact@gl.cd', phone: '+243 810 000 004', status: 'Inactif', createdAt: '18 avr. 2024' },
    { initials: 'GS', avatarClass: 'avatar-cyan', name: 'Groupe Scolaire ABC', schools: 2, email: 'contact@gsabc.cd', phone: '+243 810 000 005', status: 'Actif', createdAt: '22 mai 2024' },
    { initials: 'GD', avatarClass: 'avatar-pink', name: 'Groupe Democratique', schools: 1, email: 'contact@gd.cd', phone: '+243 810 000 006', status: 'Inactif', createdAt: '05 juin 2024' }
  ];

  form = this.createEmptyForm();

  get totalGroups(): number {
    return this.groups.length;
  }

  get activeGroups(): number {
    return this.groups.filter((group) => group.status === 'Actif').length;
  }

  get inactiveGroups(): number {
    return this.groups.filter((group) => group.status === 'Inactif').length;
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.form = this.createEmptyForm();
  }

  saveGroup(): void {
    if (!this.form.name.trim() || !this.form.email.trim()) {
      return;
    }

    const newGroup: GroupItem = {
      initials: this.makeInitials(this.form.name),
      avatarClass: this.pickAvatarClass(this.groups.length),
      name: this.form.name.trim(),
      schools: 1,
      email: this.form.email.trim(),
      phone: this.form.phone.trim() || '--',
      status: this.form.status,
      createdAt: this.formatToday()
    };

    this.groups = [newGroup, ...this.groups];
    this.closeCreateModal();
  }

  private createEmptyForm() {
    return {
      name: '',
      email: '',
      phone: '',
      description: '',
      status: 'Actif' as 'Actif' | 'Inactif'
    };
  }

  private makeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private pickAvatarClass(index: number): string {
    const classes = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-cyan', 'avatar-pink'];
    return classes[index % classes.length];
  }

  private formatToday(): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return formatter.format(new Date()).replace('.', '');
  }
}
