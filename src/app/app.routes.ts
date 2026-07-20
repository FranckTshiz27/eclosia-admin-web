import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'mfa',
    loadComponent: () => import('./pages/mfa/mfa.component').then(m => m.MfaComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'inscriptions',
    loadComponent: () =>
      import('./pages/admin/details-ecole/ecole-inscriptions/ecole-inscriptions.component').then(
        (m) => m.EcoleInscriptionsComponent
      )
  },
  {
    path: 'finances',
    loadComponent: () => import('./pages/finances/finances.component').then((m) => m.FinancesComponent)
  },
  {
    path: 'agents',
    loadComponent: () => import('./pages/agents/agents.component').then(m => m.AgentsComponent),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        loadComponent: () => import('./pages/agents/agents-list/agents-list.component').then(m => m.AgentsListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./pages/agents/agent-form/agent-form.component').then(m => m.AgentFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./pages/agents/agent-form/agent-form.component').then(m => m.AgentFormComponent)
      },
      {
        path: ':id/profile',
        loadComponent: () => import('./pages/agents/agent-profile/agent-profile.component').then(m => m.AgentProfileComponent)
      }
    ]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    children: [
      { path: '', redirectTo: 'security', pathMatch: 'full' },
      { path: 'general', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'users', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'security', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'audit', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },
  {
    path: 'statistics',
    loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent)
  },
  {
    path: 'configuration',
    children: [
      { path: '', redirectTo: 'modele-academique', pathMatch: 'full' },
      {
        path: 'domaines',
        loadComponent: () =>
          import('./pages/configuration/domaines/domaines.component').then((m) => m.DomainesComponent)
      },
      {
        path: 'sous-domaines',
        loadComponent: () =>
          import('./pages/configuration/sous-domaines/sous-domaines.component').then(
            (m) => m.SousDomainesComponent
          )
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./pages/configuration/branches/branches.component').then((m) => m.BranchesComponent)
      },
      {
        path: 'periodes-scolaires',
        loadComponent: () =>
          import('./pages/configuration/periodes-scolaires/periodes-scolaires.component').then(
            (m) => m.PeriodesScolairesComponent
          )
      },
      {
        path: 'trimestres-semestres',
        loadComponent: () =>
          import('./pages/configuration/trimestres-semestres/trimestres-semestres.component').then(
            (m) => m.TrimestresSemestresComponent
          )
      },
      {
        path: 'programme-pedagogique',
        loadComponent: () =>
          import('./pages/configuration/programme-pedagogique/programme-pedagogique.component').then(
            (m) => m.ProgrammePedagogiqueComponent
          )
      },
      {
        path: 'matieres-programme',
        loadComponent: () =>
          import('./pages/configuration/matieres-programme/matieres-programme.component').then(
            (m) => m.MatieresProgrammeComponent
          )
      },
      { path: 'annees-scolaires', redirectTo: '/admin/annees-scolaires', pathMatch: 'full' },
      {
        path: 'modele-academique',
        loadComponent: () =>
          import('./pages/configuration/modele-academique/modele-academique.component').then(
            (m) => m.ModeleAcademiqueComponent
          )
      },
      {
        path: 'cycle',
        loadComponent: () => import('./pages/configuration/cycle/cycle.component').then((m) => m.CycleComponent)
      },
      {
        path: 'section',
        loadComponent: () => import('./pages/configuration/section/section.component').then((m) => m.SectionComponent)
      },
      {
        path: 'option',
        loadComponent: () => import('./pages/configuration/option/option.component').then((m) => m.OptionComponent)
      },
      {
        path: 'niveau-scolaire',
        loadComponent: () =>
          import('./pages/configuration/niveau-scolaire/niveau-scolaire.component').then(
            (m) => m.NiveauScolaireComponent
          )
      }
    ]
  },
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'groupe', pathMatch: 'full' },
      {
        path: 'groupe',
        loadComponent: () => import('./pages/admin/groupe/groupe.component').then(m => m.GroupeComponent)
      },
      {
        path: 'ecole',
        loadComponent: () => import('./pages/admin/ecole/ecole.component').then(m => m.EcoleComponent)
      },
      {
        path: 'details-ecole',
        loadComponent: () =>
          import('./pages/admin/details-ecole/details-ecole.component').then((m) => m.DetailsEcoleComponent)
      },
      {
        path: 'annees-scolaires',
        loadComponent: () =>
          import('./pages/configuration/annees-scolaires/annees-scolaires.component').then(
            (m) => m.AnneesScolairesComponent
          )
      },
      { path: 'cycle', redirectTo: '/configuration/cycle', pathMatch: 'full' },
      { path: 'section', redirectTo: '/configuration/section', pathMatch: 'full' },
      { path: 'option', redirectTo: '/configuration/option', pathMatch: 'full' },
      { path: 'niveau-scolaire', redirectTo: '/configuration/niveau-scolaire', pathMatch: 'full' }
    ]
  },
  {
    path: 'cursus',
    loadComponent: () => import('./pages/cursus/cursus.component').then(m => m.CursusComponent)
  },
  {
    path: 'remuneration',
    loadComponent: () => import('./pages/remuneration/remuneration.component').then(m => m.RemunerationComponent)
  },
  {
    path: 'fipix-docs',
    loadComponent: () => import('./pages/fipix-docs/fipix-docs.component').then(m => m.FipixDocsComponent)
  },
  { path: '**', redirectTo: 'login' }
];
