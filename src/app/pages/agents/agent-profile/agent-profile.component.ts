import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentsService, Agent } from '../../../services/agents.service';

@Component({
  selector: 'app-agent-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-profile.component.html',
  styleUrls: ['./agent-profile.component.css']
})
export class AgentProfileComponent implements OnInit {
  @Input() agent: Agent | any = null;
  activeTab: 'personal' | 'cursus' | 'promotion' | 'remuneration' = 'personal';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agentsService: AgentsService
  ) {}

  ngOnInit() {
    // If agent wasn't passed as @Input, fetch it from route
    if (!this.agent) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        const agentId = parseInt(id, 10);
        this.agent = this.agentsService.getAgents().find(a => a.id === agentId);
      }
    }
  }

  setTab(tab: 'personal' | 'cursus' | 'promotion' | 'remuneration') {
    this.activeTab = tab;
  }

  goToEdit() {
    if (this.agent) {
      this.router.navigate(['/agents', this.agent.id, 'edit']);
    }
  }
}
