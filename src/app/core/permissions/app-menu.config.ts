import { P, PermissionCode } from './permission.catalog';

export interface AppMenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  queryParams?: Record<string, string>;
  /** Une de ces permissions suffit pour voir l'entrée (ou ses enfants visibles). */
  permissions?: PermissionCode[];
  children?: AppMenuItem[];
  /** Section affichée dans le footer de la sidebar */
  footer?: boolean;
}

/**
 * Définition centralisée des menus (filtrée par PermissionService).
 * Chaque entrée référence sa permission dédiée dans P.
 */
export const APP_MENU: AppMenuItem[] = [
  {
    id: 'dashboard',
    label: 'TABLEAU DE BORD',
    icon: 'bi-speedometer2',
    route: '/dashboard',
    permissions: [P.DASHBOARD_VIEW]
  },
  {
    id: 'students',
    label: 'ÉLÈVES',
    icon: 'bi-people',
    permissions: [
      P.STUDENTS_SECTION_VIEW,
      P.ENROLLMENT_VIEW,
      P.GUARDIAN_VIEW,
      P.STUDENT_CATEGORY_VIEW,
      P.GRADE_ENTRY_VIEW,
      P.STUDENT_VIEW
    ],
    children: [
      {
        id: 'inscriptions',
        label: 'Inscriptions',
        icon: '',
        route: '/inscriptions',
        queryParams: { tab: 'inscriptions' },
        permissions: [P.ENROLLMENT_VIEW]
      },
      {
        id: 'guardians',
        label: 'Tuteurs',
        icon: '',
        route: '/inscriptions',
        queryParams: { tab: 'tuteurs' },
        permissions: [P.GUARDIAN_VIEW]
      },
      {
        id: 'student-categories',
        label: "Catégories d'élèves",
        icon: '',
        route: '/inscriptions',
        queryParams: { tab: 'categories-eleves' },
        permissions: [P.STUDENT_CATEGORY_VIEW]
      },
      {
        id: 'grades-entry',
        label: 'Saisie des points',
        icon: '',
        route: '/saisie-des-points',
        permissions: [P.GRADE_ENTRY_VIEW]
      }
    ]
  },
  {
    id: 'finances',
    label: 'FINANCES',
    icon: 'bi-wallet2',
    permissions: [
      P.FINANCES_SECTION_VIEW,
      P.FINANCE_DASHBOARD_VIEW,
      P.PAYMENT_VIEW,
      P.FEE_CATEGORY_VIEW,
      P.INSTALLMENT_VIEW,
      P.FEE_VIEW,
      P.CURRENCY_VIEW,
      P.EXCHANGE_RATE_VIEW,
      P.FINANCIAL_STATEMENT_VIEW
    ],
    children: [
      {
        id: 'finance-dashboard',
        label: 'Tableau de bord financier',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'tableau-de-bord-financier' },
        permissions: [P.FINANCE_DASHBOARD_VIEW]
      },
      {
        id: 'payments',
        label: 'Paiements',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'paiements' },
        permissions: [P.PAYMENT_VIEW]
      },
      {
        id: 'fee-categories',
        label: 'Catégories de frais',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'categories-frais' },
        permissions: [P.FEE_CATEGORY_VIEW]
      },
      {
        id: 'installments',
        label: 'Tranches',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'tranches-paiement' },
        permissions: [P.INSTALLMENT_VIEW]
      },
      {
        id: 'fees',
        label: 'Frais',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'frais-scolaires' },
        permissions: [P.FEE_VIEW]
      },
      {
        id: 'currencies',
        label: 'Devises',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'devises' },
        permissions: [P.CURRENCY_VIEW]
      },
      {
        id: 'rates',
        label: 'Taux de change',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'taux' },
        permissions: [P.EXCHANGE_RATE_VIEW]
      },
      {
        id: 'financial-statements',
        label: 'États financiers',
        icon: '',
        route: '/finances',
        queryParams: { tab: 'etats-financiers' },
        permissions: [P.FINANCIAL_STATEMENT_VIEW]
      }
    ]
  },
  {
    id: 'reports',
    label: 'RAPPORTS',
    icon: 'bi-file-earmark-bar-graph',
    permissions: [P.REPORTS_SECTION_VIEW, P.BULLETIN_PRINT_VIEW, P.REPORT_VIEW],
    children: [
      {
        id: 'bulletins',
        label: 'Impression des bulletins',
        icon: '',
        route: '/rapports/impression-des-bulletins',
        permissions: [P.BULLETIN_PRINT_VIEW]
      }
    ]
  },
  {
    id: 'access',
    label: 'ACCÈS',
    icon: 'bi-shield-lock',
    permissions: [
      P.ACCESS_SECTION_VIEW,
      P.MODULE_VIEW,
      P.FEATURE_VIEW,
      P.ROLE_VIEW,
      P.PERMISSION_VIEW,
      P.USER_VIEW
    ],
    children: [
      {
        id: 'modules',
        label: 'Module',
        icon: '',
        route: '/acces/modules',
        permissions: [P.MODULE_VIEW]
      },
      {
        id: 'features',
        label: 'Fonctionnalités',
        icon: '',
        route: '/acces/fonctionnalites',
        permissions: [P.FEATURE_VIEW]
      },
      {
        id: 'roles',
        label: 'Rôle',
        icon: '',
        route: '/acces/roles',
        permissions: [P.ROLE_VIEW]
      },
      {
        id: 'permissions',
        label: 'Permissions',
        icon: '',
        route: '/acces/permissions',
        permissions: [P.PERMISSION_VIEW]
      },
      {
        id: 'users',
        label: 'Utilisateurs',
        icon: '',
        route: '/acces/utilisateurs',
        permissions: [P.USER_VIEW]
      }
    ]
  },
  {
    id: 'agents',
    label: 'GESTION AGENTS',
    icon: 'bi-people',
    permissions: [P.AGENTS_SECTION_VIEW, P.AGENT_LIST_VIEW, P.AGENT_CREATE, P.AGENT_VIEW],
    children: [
      {
        id: 'agent-create',
        label: 'Créer un agent',
        icon: 'bi-person-plus',
        route: '/agents/create',
        permissions: [P.AGENT_CREATE]
      },
      {
        id: 'agent-list',
        label: 'Liste des agents',
        icon: 'bi-person-lines-fill',
        route: '/agents/list',
        permissions: [P.AGENT_LIST_VIEW]
      }
    ]
  },
  {
    id: 'agent-stats',
    label: 'STATISTIQUE DES AGENTS',
    icon: 'bi-bar-chart-line',
    route: '/statistics',
    permissions: [P.AGENT_STATS_VIEW]
  },
  {
    id: 'pedagogical-config',
    label: 'CONFIGURATION PÉDAGOGIQUE',
    icon: 'bi-mortarboard',
    permissions: [
      P.PEDAGOGICAL_CONFIG_SECTION_VIEW,
      P.DOMAIN_VIEW,
      P.SUBDOMAIN_VIEW,
      P.SUBJECT_VIEW,
      P.PERIOD_VIEW,
      P.TERM_VIEW,
      P.CURRICULUM_VIEW,
      P.CURRICULUM_SUBJECT_VIEW
    ],
    children: [
      {
        id: 'domains',
        label: 'Domaines',
        icon: 'bi-bookmarks',
        route: '/configuration/domaines',
        permissions: [P.DOMAIN_VIEW]
      },
      {
        id: 'subdomains',
        label: 'Sous-domaines',
        icon: 'bi-diagram-3',
        route: '/configuration/sous-domaines',
        permissions: [P.SUBDOMAIN_VIEW]
      },
      {
        id: 'subjects',
        label: 'Branches',
        icon: 'bi-diagram-2',
        route: '/configuration/branches',
        permissions: [P.SUBJECT_VIEW]
      },
      {
        id: 'periods',
        label: 'Périodes scolaires',
        icon: 'bi-calendar3',
        route: '/configuration/periodes-scolaires',
        permissions: [P.PERIOD_VIEW]
      },
      {
        id: 'terms',
        label: 'Trimestres / Semestres',
        icon: 'bi-calendar-range',
        route: '/configuration/trimestres-semestres',
        permissions: [P.TERM_VIEW]
      },
      {
        id: 'curriculum',
        label: 'Programme pédagogique',
        icon: 'bi-journal-richtext',
        route: '/configuration/programme-pedagogique',
        permissions: [P.CURRICULUM_VIEW]
      },
      {
        id: 'curriculum-subjects',
        label: 'Matières du programme',
        icon: 'bi-journal-bookmark',
        route: '/configuration/matieres-programme',
        permissions: [P.CURRICULUM_SUBJECT_VIEW]
      }
    ]
  },
  {
    id: 'configuration',
    label: 'CONFIGURATION',
    icon: 'bi-sliders2',
    permissions: [
      P.CONFIGURATION_SECTION_VIEW,
      P.ACADEMIC_MODEL_VIEW,
      P.CYCLE_VIEW,
      P.SECTION_VIEW,
      P.OPTION_VIEW,
      P.LEVEL_VIEW
    ],
    children: [
      {
        id: 'academic-model',
        label: 'Modele academique',
        icon: 'bi-journal-bookmark',
        route: '/configuration/modele-academique',
        permissions: [P.ACADEMIC_MODEL_VIEW]
      },
      {
        id: 'cycle',
        label: 'Cycle',
        icon: 'bi-arrow-repeat',
        route: '/configuration/cycle',
        permissions: [P.CYCLE_VIEW]
      },
      {
        id: 'section',
        label: 'Section',
        icon: 'bi-columns-gap',
        route: '/configuration/section',
        permissions: [P.SECTION_VIEW]
      },
      {
        id: 'option',
        label: 'Option',
        icon: 'bi-list-ul',
        route: '/configuration/option',
        permissions: [P.OPTION_VIEW]
      },
      {
        id: 'level',
        label: 'Niveau scolaire',
        icon: 'bi-bar-chart-steps',
        route: '/configuration/niveau-scolaire',
        permissions: [P.LEVEL_VIEW]
      }
    ]
  },
  {
    id: 'admin',
    label: 'ADMIN',
    icon: 'bi-grid',
    permissions: [
      P.ADMIN_SECTION_VIEW,
      P.GROUP_VIEW,
      P.SCHOOL_VIEW,
      P.SCHOOL_DETAILS_VIEW,
      P.ACADEMIC_YEAR_VIEW
    ],
    children: [
      {
        id: 'group',
        label: 'Groupe',
        icon: 'bi-diagram-3',
        route: '/admin/groupe',
        permissions: [P.GROUP_VIEW]
      },
      {
        id: 'school',
        label: 'École',
        icon: 'bi-building',
        route: '/admin/ecole',
        permissions: [P.SCHOOL_VIEW]
      },
      {
        id: 'school-details',
        label: 'Details ecole',
        icon: 'bi-building-gear',
        route: '/admin/details-ecole',
        permissions: [P.SCHOOL_DETAILS_VIEW]
      },
      {
        id: 'academic-years',
        label: 'Années scolaires',
        icon: 'bi-calendar-range',
        route: '/admin/annees-scolaires',
        permissions: [P.ACADEMIC_YEAR_VIEW]
      }
    ]
  },
  {
    id: 'settings',
    label: 'GESTION DES ACCES',
    icon: 'bi-gear',
    footer: true,
    permissions: [
      P.SETTINGS_SECTION_VIEW,
      P.SETTINGS_VIEW,
      P.SETTINGS_USERS_VIEW,
      P.SETTINGS_SECURITY_VIEW,
      P.AUDIT_VIEW
    ],
    children: [
      {
        id: 'settings-general',
        label: 'Général',
        icon: 'bi-sliders',
        route: '/settings/general',
        permissions: [P.SETTINGS_VIEW]
      },
      {
        id: 'settings-users',
        label: 'Utilisateurs',
        icon: 'bi-person-badge',
        route: '/settings/users',
        permissions: [P.SETTINGS_USERS_VIEW]
      },
      {
        id: 'settings-security',
        label: 'Sécurité',
        icon: 'bi-shield-lock',
        route: '/settings/security',
        permissions: [P.SETTINGS_SECURITY_VIEW]
      },
      {
        id: 'settings-audit',
        label: 'Audit logs',
        icon: 'bi-journal-text',
        route: '/settings/audit',
        permissions: [P.AUDIT_VIEW]
      }
    ]
  }
];
