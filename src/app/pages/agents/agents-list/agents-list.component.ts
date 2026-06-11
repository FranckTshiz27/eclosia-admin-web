import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

// Angular Material
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

// Services & Composants
import { AgentsService, Agent } from '../../../services/agents.service';
import { AgentDetailDialogComponent } from '../agent-detail-dialog/agent-detail-dialog.component';

@Component({
  selector: 'app-agents-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommonModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './agents-list.component.html',
  styleUrls: ['./agents-list.component.css']
})
export class AgentsListComponent implements OnInit {

  displayedColumns: string[] = ['index', 'matricule', 'nomComplet', 'sexe', 'etatCivil', 'service', 'grade', 'anciennete', 'actions'];

  allAgents: Agent[] = [];
  filteredAgents: Agent[] = [];
  pagedAgents: Agent[] = [];
  services: string[] = [];

  // Pagination states
  pageSize = 10;
  currentPage = 0;
  pageSizeOptions = [10, 25, 50];

  // Sort states
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Filtres
  filterNom = '';
  filterMatricule = '';
  filterSexe = '';
  filterService = '';
  filterDirection = '';
  filterProvince = '';
  filterGrade = '';
  filterLevel = '';

  // Options pour filtres
  directions: string[] = [];
  provinces: string[] = [];
  grades: string[] = [];
  levels: string[] = [];

  constructor(
    private agentsService: AgentsService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.allAgents = this.agentsService.getAgents();
    this.services = this.agentsService.getServices();
    this.directions = this.agentsService.getDirections();
    this.provinces = this.agentsService.getProvinces();
    this.grades = this.agentsService.getGrades();
    this.levels = this.agentsService.getLevels();
    this.filteredAgents = this.allAgents;
    this.updatePagination();
  }

  // Custom sort logic
  sortData(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredAgents.sort((a, b) => {
      let valA: any = (a as any)[column] || '';
      let valB: any = (b as any)[column] || '';

      if (column === 'nomComplet') {
        valA = `${a.nom} ${a.postnom} ${a.prenom}`.toLowerCase();
        valB = `${b.nom} ${b.postnom} ${b.prenom}`.toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.currentPage = 0;
    this.updatePagination();
  }

  updatePagination() {
    const startIndex = this.currentPage * this.pageSize;
    this.pagedAgents = this.filteredAgents.slice(startIndex, startIndex + this.pageSize);
  }

  changePage(pageIndex: number) {
    this.currentPage = pageIndex;
    this.updatePagination();
  }

  changePageSize(event: any) {
    this.pageSize = parseInt(event.target.value, 10);
    this.currentPage = 0;
    this.updatePagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredAgents.length / this.pageSize);
  }

  applyFilter() {
    let filtered = this.allAgents;

    if (this.filterNom.trim()) {
      const q = this.filterNom.trim().toLowerCase();
      filtered = filtered.filter(a =>
        a.nom.toLowerCase().includes(q) ||
        a.postnom.toLowerCase().includes(q) ||
        a.prenom.toLowerCase().includes(q)
      );
    }

    if (this.filterMatricule.trim()) {
      const q = this.filterMatricule.trim().toLowerCase();
      filtered = filtered.filter(a => a.matricule.toLowerCase().includes(q));
    }

    if (this.filterSexe) {
      filtered = filtered.filter(a => a.sexe === this.filterSexe);
    }

    if (this.filterService) {
      filtered = filtered.filter(a => a.service === this.filterService);
    }

    if (this.filterDirection) {
      filtered = filtered.filter(a => (a.direction || a.service) === this.filterDirection);
    }

    if (this.filterProvince) {
      filtered = filtered.filter(a => (a.province || 'Kinshasa') === this.filterProvince);
    }

    if (this.filterGrade) {
      filtered = filtered.filter(a => a.grade === this.filterGrade);
    }

    if (this.filterLevel) {
      filtered = filtered.filter(a => a.cursusNiveau === this.filterLevel);
    }

    this.filteredAgents = filtered;
    this.currentPage = 0;
    this.updatePagination();
  }

  resetFilters() {
    this.filterNom = '';
    this.filterMatricule = '';
    this.filterSexe = '';
    this.filterService = '';
    this.filterDirection = '';
    this.filterProvince = '';
    this.filterGrade = '';
    this.filterLevel = '';
    this.filteredAgents = this.allAgents;
    this.currentPage = 0;
    this.updatePagination();
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterNom || this.filterMatricule || this.filterSexe || this.filterService || 
              this.filterDirection || this.filterProvince || this.filterGrade || this.filterLevel);
  }

  get filteredCount(): number {
    return this.filteredAgents.length;
  }

  openDetail(agent: Agent) {
    this.router.navigate(['/agents', agent.id, 'profile']);
  }

  openEdit(agent: Agent) {
    this.router.navigate(['/agents', agent.id, 'edit']);
  }

  deleteAgent(agent: Agent) {
    // Implémentation future
    console.log('Delete agent:', agent.id);
  }

  exportExcel() {
    this.agentsService.exportToExcel(this.filteredAgents);
  }

  getRowClass(agent: Agent): string {
    return '';
  }
}
