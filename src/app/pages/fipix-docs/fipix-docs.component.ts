import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fipix-docs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fipix-docs.component.html',
  styleUrl: './fipix-docs.component.css'
})
export class FipixDocsComponent {
  currentSection = 'introduction';

  sections: any[] = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'layout', label: 'Layout & Grid' },
    { id: 'typography', label: 'Typographie' },
    { id: 'colors', label: 'Couleurs & Design' },
    { 
      id: 'components', 
      label: 'Composants',
      expanded: true,
      children: [
        { id: 'buttons', label: 'Boutons' },
        { id: 'badges', label: 'Badges' },
        { id: 'alerts', label: 'Alertes' },
        { id: 'cards', label: 'Cartes' },
        { id: 'tables', label: 'Tableaux' },
        { id: 'forms', label: 'Formulaires' },
        { id: 'loaders', label: 'Loaders' },
        { id: 'interactive', label: 'Interactifs' }
      ]
    },
    { id: 'media', label: 'Médias' },
    { id: 'utilities', label: 'Utilitaires' }
  ];

  toggleExpanded(section: any) {
    if (section.children) {
      section.expanded = !section.expanded;
    }
  }

  scrollTo(sectionId: string) {
    this.currentSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
