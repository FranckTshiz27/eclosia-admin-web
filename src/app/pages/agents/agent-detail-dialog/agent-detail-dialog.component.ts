import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import { Agent } from '../../../services/agents.service';

@Component({
  selector: 'app-agent-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule
  ],
  templateUrl: './agent-detail-dialog.component.html',
  styleUrls: ['./agent-detail-dialog.component.css']
})
export class AgentDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AgentDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public agent: Agent
  ) {}

  close() {
    this.dialogRef.close();
  }

  getNomComplet(): string {
    return `${this.agent.prenom} ${this.agent.nom} ${this.agent.postnom}`;
  }

  getSexeLabel(): string {
    return this.agent.sexe === 'M' ? 'Masculin' : 'Féminin';
  }
}
