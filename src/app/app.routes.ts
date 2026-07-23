import { Routes } from '@angular/router';
import { authGuard } from './core/permissions/permission.guard';
import { P } from './core/permissions/permission.catalog';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'forbidden',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/forbidden/forbidden.component').then((m) => m.ForbiddenComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    data: { permission: P.DASHBOARD_VIEW },
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'inscriptions',
    canActivate: [authGuard],
    data: {
      permissions: [P.ENROLLMENT_VIEW, P.GUARDIAN_VIEW, P.STUDENT_CATEGORY_VIEW, P.STUDENT_VIEW],
      permissionMode: 'any'
    },
    loadComponent: () =>
      import('./pages/admin/details-ecole/ecole-inscriptions/ecole-inscriptions.component').then(
        (m) => m.EcoleInscriptionsComponent
      )
  },
  {
    path: 'saisie-des-points',
    canActivate: [authGuard],
    data: { permission: P.GRADE_ENTRY_VIEW },
    loadComponent: () =>
      import('./pages/pedagogie/saisie-des-points/saisie-des-points.component').then(
        (m) => m.SaisieDesPointsComponent
      )
  },
  {
    path: 'finances',
    canActivate: [authGuard],
    data: {
      permissions: [
        P.FINANCE_DASHBOARD_VIEW,
        P.PAYMENT_VIEW,
        P.FEE_CATEGORY_VIEW,
        P.INSTALLMENT_VIEW,
        P.FEE_VIEW,
        P.CURRENCY_VIEW,
        P.EXCHANGE_RATE_VIEW,
        P.FINANCIAL_STATEMENT_VIEW
      ],
      permissionMode: 'any'
    },
    loadComponent: () => import('./pages/finances/finances.component').then((m) => m.FinancesComponent)
  },
  {
    path: 'rapports',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'impression-des-bulletins', pathMatch: 'full' },
      {
        path: 'impression-des-bulletins',
        canActivate: [authGuard],
        data: { permission: P.BULLETIN_PRINT_VIEW },
        loadComponent: () =>
          import('./pages/rapports/impression-des-bulletins/impression-des-bulletins.component').then(
            (m) => m.ImpressionDesBulletinsComponent
          )
      }
    ]
  },
  {
    path: 'acces',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'modules', pathMatch: 'full' },
      {
        path: 'modules',
        canActivate: [authGuard],
        data: { permission: P.MODULE_VIEW },
        loadComponent: () =>
          import('./pages/acces/modules/modules.component').then((m) => m.ModulesComponent)
      },
      {
        path: 'fonctionnalites',
        canActivate: [authGuard],
        data: { permission: P.FEATURE_VIEW },
        loadComponent: () =>
          import('./pages/acces/fonctionnalites/fonctionnalites.component').then(
            (m) => m.FonctionnalitesComponent
          )
      },
      {
        path: 'roles',
        canActivate: [authGuard],
        data: { permission: P.ROLE_VIEW },
        loadComponent: () => import('./pages/acces/roles/roles.component').then((m) => m.RolesComponent)
      },
      {
        path: 'permissions',
        canActivate: [authGuard],
        data: { permission: P.PERMISSION_VIEW },
        loadComponent: () =>
          import('./pages/acces/permissions/permissions.component').then((m) => m.PermissionsComponent)
      },
      {
        path: 'utilisateurs',
        canActivate: [authGuard],
        data: { permission: P.USER_VIEW },
        loadComponent: () =>
          import('./pages/acces/utilisateurs/utilisateurs.component').then((m) => m.UtilisateursComponent)
      }
    ]
  },
  {
    path: 'agents',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/agents/agents.component').then((m) => m.AgentsComponent),
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        canActivate: [authGuard],
        data: { permission: P.AGENT_LIST_VIEW },
        loadComponent: () =>
          import('./pages/agents/agents-list/agents-list.component').then((m) => m.AgentsListComponent)
      },
      {
        path: 'create',
        canActivate: [authGuard],
        data: { permission: P.AGENT_CREATE },
        loadComponent: () =>
          import('./pages/agents/agent-form/agent-form.component').then((m) => m.AgentFormComponent)
      },
      {
        path: ':id/edit',
        canActivate: [authGuard],
        data: { permission: P.AGENT_UPDATE },
        loadComponent: () =>
          import('./pages/agents/agent-form/agent-form.component').then((m) => m.AgentFormComponent)
      },
      {
        path: ':id/profile',
        canActivate: [authGuard],
        data: { permissions: [P.AGENT_LIST_VIEW, P.AGENT_VIEW], permissionMode: 'any' },
        loadComponent: () =>
          import('./pages/agents/agent-profile/agent-profile.component').then(
            (m) => m.AgentProfileComponent
          )
      }
    ]
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
    children: [
      { path: '', redirectTo: 'security', pathMatch: 'full' },
      {
        path: 'general',
        canActivate: [authGuard],
        data: { permission: P.SETTINGS_VIEW },
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'users',
        canActivate: [authGuard],
        data: { permission: P.SETTINGS_USERS_VIEW },
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'security',
        canActivate: [authGuard],
        data: { permission: P.SETTINGS_SECURITY_VIEW },
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'audit',
        canActivate: [authGuard],
        data: { permission: P.AUDIT_VIEW },
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent)
      }
    ]
  },
  {
    path: 'statistics',
    canActivate: [authGuard],
    data: { permission: P.AGENT_STATS_VIEW },
    loadComponent: () =>
      import('./pages/statistics/statistics.component').then((m) => m.StatisticsComponent)
  },
  {
    path: 'configuration',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'modele-academique', pathMatch: 'full' },
      {
        path: 'domaines',
        canActivate: [authGuard],
        data: { permission: P.DOMAIN_VIEW },
        loadComponent: () =>
          import('./pages/configuration/domaines/domaines.component').then((m) => m.DomainesComponent)
      },
      {
        path: 'sous-domaines',
        canActivate: [authGuard],
        data: { permission: P.SUBDOMAIN_VIEW },
        loadComponent: () =>
          import('./pages/configuration/sous-domaines/sous-domaines.component').then(
            (m) => m.SousDomainesComponent
          )
      },
      {
        path: 'branches',
        canActivate: [authGuard],
        data: { permission: P.SUBJECT_VIEW },
        loadComponent: () =>
          import('./pages/configuration/branches/branches.component').then((m) => m.BranchesComponent)
      },
      {
        path: 'periodes-scolaires',
        canActivate: [authGuard],
        data: { permission: P.PERIOD_VIEW },
        loadComponent: () =>
          import('./pages/configuration/periodes-scolaires/periodes-scolaires.component').then(
            (m) => m.PeriodesScolairesComponent
          )
      },
      {
        path: 'trimestres-semestres',
        canActivate: [authGuard],
        data: { permission: P.TERM_VIEW },
        loadComponent: () =>
          import('./pages/configuration/trimestres-semestres/trimestres-semestres.component').then(
            (m) => m.TrimestresSemestresComponent
          )
      },
      {
        path: 'programme-pedagogique',
        canActivate: [authGuard],
        data: { permission: P.CURRICULUM_VIEW },
        loadComponent: () =>
          import('./pages/configuration/programme-pedagogique/programme-pedagogique.component').then(
            (m) => m.ProgrammePedagogiqueComponent
          )
      },
      {
        path: 'matieres-programme',
        canActivate: [authGuard],
        data: { permission: P.CURRICULUM_SUBJECT_VIEW },
        loadComponent: () =>
          import('./pages/configuration/matieres-programme/matieres-programme.component').then(
            (m) => m.MatieresProgrammeComponent
          )
      },
      { path: 'annees-scolaires', redirectTo: '/admin/annees-scolaires', pathMatch: 'full' },
      {
        path: 'modele-academique',
        canActivate: [authGuard],
        data: { permission: P.ACADEMIC_MODEL_VIEW },
        loadComponent: () =>
          import('./pages/configuration/modele-academique/modele-academique.component').then(
            (m) => m.ModeleAcademiqueComponent
          )
      },
      {
        path: 'cycle',
        canActivate: [authGuard],
        data: { permission: P.CYCLE_VIEW },
        loadComponent: () =>
          import('./pages/configuration/cycle/cycle.component').then((m) => m.CycleComponent)
      },
      {
        path: 'section',
        canActivate: [authGuard],
        data: { permission: P.SECTION_VIEW },
        loadComponent: () =>
          import('./pages/configuration/section/section.component').then((m) => m.SectionComponent)
      },
      {
        path: 'option',
        canActivate: [authGuard],
        data: { permission: P.OPTION_VIEW },
        loadComponent: () =>
          import('./pages/configuration/option/option.component').then((m) => m.OptionComponent)
      },
      {
        path: 'niveau-scolaire',
        canActivate: [authGuard],
        data: { permission: P.LEVEL_VIEW },
        loadComponent: () =>
          import('./pages/configuration/niveau-scolaire/niveau-scolaire.component').then(
            (m) => m.NiveauScolaireComponent
          )
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'groupe', pathMatch: 'full' },
      {
        path: 'groupe',
        canActivate: [authGuard],
        data: { permission: P.GROUP_VIEW },
        loadComponent: () => import('./pages/admin/groupe/groupe.component').then((m) => m.GroupeComponent)
      },
      {
        path: 'ecole',
        canActivate: [authGuard],
        data: { permission: P.SCHOOL_VIEW },
        loadComponent: () => import('./pages/admin/ecole/ecole.component').then((m) => m.EcoleComponent)
      },
      {
        path: 'details-ecole',
        canActivate: [authGuard],
        data: { permission: P.SCHOOL_DETAILS_VIEW },
        loadComponent: () =>
          import('./pages/admin/details-ecole/details-ecole.component').then((m) => m.DetailsEcoleComponent)
      },
      {
        path: 'annees-scolaires',
        canActivate: [authGuard],
        data: { permission: P.ACADEMIC_YEAR_VIEW },
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
    canActivate: [authGuard],
    data: { permission: P.CURSUS_VIEW },
    loadComponent: () => import('./pages/cursus/cursus.component').then((m) => m.CursusComponent)
  },
  {
    path: 'remuneration',
    canActivate: [authGuard],
    data: { permission: P.REMUNERATION_VIEW },
    loadComponent: () =>
      import('./pages/remuneration/remuneration.component').then((m) => m.RemunerationComponent)
  },
  {
    path: 'fipix-docs',
    loadComponent: () => import('./pages/fipix-docs/fipix-docs.component').then((m) => m.FipixDocsComponent)
  },
  { path: '**', redirectTo: 'login' }
];
