import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { resolveHomeUrl } from '../../core/permissions/permission-navigation';
import { PermissionService } from '../../core/permissions/permission.service';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="forbidden-page">
      <div class="forbidden-card">
        <div class="forbidden-icon"><i class="bi bi-shield-x"></i></div>
        <h1>Accès refusé</h1>
        <p>Vous n’avez pas la permission d’accéder à cette page.</p>
        <p class="from" *ngIf="fromUrl">Ressource demandée : <code>{{ fromUrl }}</code></p>
        <div class="actions">
          <a [routerLink]="homeUrl" class="btn-primary">Retour à l’accueil</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .forbidden-page {
        min-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .forbidden-card {
        max-width: 480px;
        width: 100%;
        text-align: center;
        background: #fff;
        border: 1px solid #e6ebf2;
        border-radius: 16px;
        padding: 36px 28px;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      }
      .forbidden-icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 16px;
        border-radius: 50%;
        background: #fef3f2;
        color: #b42318;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.6rem;
        color: #18213a;
      }
      p {
        margin: 0 0 10px;
        color: #667085;
      }
      .from code {
        font-size: 12px;
        color: #344054;
      }
      .actions {
        margin-top: 18px;
      }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 42px;
        padding: 0 18px;
        border-radius: 10px;
        background: #0a53de;
        color: #fff;
        text-decoration: none;
        font-weight: 600;
      }
    `
  ]
})
export class ForbiddenComponent implements OnInit {
  fromUrl = '';
  homeUrl = '/dashboard';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.fromUrl = this.route.snapshot.queryParamMap.get('from') || '';
    this.homeUrl = resolveHomeUrl(this.permissionService);
    if (this.homeUrl === '/forbidden') {
      this.homeUrl = '/login';
    }
  }
}
