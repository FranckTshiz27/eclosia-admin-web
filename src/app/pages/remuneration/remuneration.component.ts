import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-remuneration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './remuneration.component.html',
  styleUrl: './remuneration.component.css'
})
export class RemunerationComponent {}
