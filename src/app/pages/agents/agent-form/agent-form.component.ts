import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentsService, Agent } from '../../../services/agents.service';

@Component({
  selector: 'app-agent-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-form.component.html',
  styleUrls: ['./agent-form.component.css']
})
export class AgentFormComponent implements OnInit {
  @Input() agent: Agent | any = null;
  @Input() view: 'create' | 'edit' = 'create';
  
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<Agent>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agentsService: AgentsService
  ) {}

  ngOnInit() {
    // Determine mode from route if Input is not provided
    const url = this.router.url;
    if (url.includes('/edit')) {
      this.view = 'edit';
    } else if (url.includes('/create')) {
      this.view = 'create';
    }

    if (!this.agent) {
      if (this.view === 'edit') {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
          const agentId = parseInt(id, 10);
          this.agent = JSON.parse(JSON.stringify(this.agentsService.getAgents().find(a => a.id === agentId) || {}));
        }
      } else {
        this.agent = this.getEmptyAgent();
      }
    }
  }

  private getEmptyAgent(): Agent {
    return {
      id: 0, nom: '', postnom: '', prenom: '', matricule: '', sexe: 'M', etatCivil: '',
      service: '', grade: '', fonction: '', dateNaissance: '', lieuNaissance: '',
      commune: '', adresse: '', email: '', tel1: '', dateEntree: '', anciennete: '',
      nombrePromotions: 0, cursusEtablissement: '', cursusNiveau: '', cursusTitre: '',
      remunerationType: '', remunerationMontant: '', province: '', direction: '',
      familyMembers: [this.getEmptyFamilyMember()],
      cursusList: [this.getEmptyCursus()]
    };
  }

  private getEmptyFamilyMember(): any {
    return { nom: '', postnom: '', prenom: '', sexe: '', lieuNaissance: '', dateNaissance: '', degre: '' };
  }

  private getEmptyCursus(): any {
    return { etablissement: '', departement: '', specialisation: '', niveau: '', dateDebut: '', dateFin: '', titre: '', resultat: '', bourse: '' };
  }

  addFamilyMember() {
    if (!this.agent.familyMembers) this.agent.familyMembers = [];
    this.agent.familyMembers.push(this.getEmptyFamilyMember());
  }

  removeFamilyMember(index: number) {
    this.agent.familyMembers.splice(index, 1);
  }

  addCursus() {
    if (!this.agent.cursusList) this.agent.cursusList = [];
    this.agent.cursusList.push(this.getEmptyCursus());
  }

  removeCursus(index: number) {
    this.agent.cursusList.splice(index, 1);
  }

  onCancel() {
    this.router.navigate(['/agents/list']);
    this.cancel.emit();
  }

  onSave() {
    if (this.agent) {
      this.persistAgent();
      this.save.emit(this.agent);
      this.router.navigate(['/agents/list']);
    }
  }

  onSaveAndContinue() {
    if (this.agent) {
      this.persistAgent();
      this.save.emit(this.agent);
      alert('Agent ' + this.agent.nom + ' enregistré avec succès ! Vous pouvez en créer un autre.');
      this.agent = this.getEmptyAgent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private persistAgent() {
    if (this.view === 'create') {
      this.agentsService.addAgent(this.agent);
    } else {
      this.agentsService.updateAgent(this.agent);
    }
  }
}
