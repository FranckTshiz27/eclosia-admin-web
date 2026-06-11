import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AgentDetailDialogComponent } from './agent-detail-dialog/agent-detail-dialog.component';
import { AgentsService } from '../../services/agents.service';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule
  ],
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.css']
})
export class AgentsComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private agentsService: AgentsService
  ) {}

  ngOnInit() {

  }

}
