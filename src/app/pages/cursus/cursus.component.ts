import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cursus',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cursus.component.html',
  styleUrl: './cursus.component.css'
})
export class CursusComponent {}
