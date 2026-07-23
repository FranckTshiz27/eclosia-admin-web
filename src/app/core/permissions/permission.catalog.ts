/**
 * Catalogue central des permissions Éclosia.
 *
 * Format : `${moduleName}.${action}` en minuscules (aligné sur login.permissions).
 * Chaque section / option de menu a sa propre entrée VIEW.
 * Les actions CRUD restent sur le module métier concerné.
 *
 * Ne jamais écrire ces chaînes en dur hors de ce fichier.
 */
export const P = {
  // -------------------------------------------------------------------------
  // TABLEAU DE BORD
  // -------------------------------------------------------------------------
  DASHBOARD_VIEW: 'dashboard_view.view',

  // -------------------------------------------------------------------------
  // ÉLÈVES
  // -------------------------------------------------------------------------
  STUDENTS_SECTION_VIEW: 'eleves.view',
  ENROLLMENT_VIEW: 'inscriptions.view',
  ENROLLMENT_CREATE: 'inscriptions.create',
  ENROLLMENT_UPDATE: 'inscriptions.update',
  ENROLLMENT_DELETE: 'inscriptions.delete',
  GUARDIAN_VIEW: 'tuteurs.view',
  GUARDIAN_CREATE: 'tuteurs.create',
  GUARDIAN_UPDATE: 'tuteurs.update',
  GUARDIAN_DELETE: 'tuteurs.delete',
  STUDENT_CATEGORY_VIEW: 'categories_eleves.view',
  STUDENT_CATEGORY_CREATE: 'categories_eleves.create',
  STUDENT_CATEGORY_UPDATE: 'categories_eleves.update',
  STUDENT_CATEGORY_DELETE: 'categories_eleves.delete',
  GRADE_ENTRY_VIEW: 'saisie_des_points.view',
  GRADE_VIEW: 'saisie_des_points.view',
  GRADE_CREATE: 'saisie_des_points.create',
  GRADE_UPDATE: 'saisie_des_points.update',
  GRADE_VALIDATE: 'saisie_des_points.validate',
  GRADE_DELETE: 'saisie_des_points.delete',
  /** Entité élève (hors menu dédié) */
  STUDENT_VIEW: 'eleve.view',
  STUDENT_CREATE: 'eleve.create',
  STUDENT_UPDATE: 'eleve.update',
  STUDENT_DELETE: 'eleve.delete',

  // -------------------------------------------------------------------------
  // FINANCES
  // -------------------------------------------------------------------------
  FINANCES_SECTION_VIEW: 'finances.view',
  FINANCE_DASHBOARD_VIEW: 'tableau_de_bord_financier.view',
  FINANCE_VIEW: 'tableau_de_bord_financier.view',
  FINANCE_CREATE: 'tableau_de_bord_financier.create',
  FINANCE_UPDATE: 'tableau_de_bord_financier.update',
  FINANCE_DELETE: 'tableau_de_bord_financier.delete',
  PAYMENT_VIEW: 'paiement.view',
  PAYMENT_CREATE: 'paiement.create',
  PAYMENT_UPDATE: 'paiement.update',
  PAYMENT_DELETE: 'paiement.delete',
  PAYMENT_PRINT: 'paiement.print',
  PAYMENT_VALIDATE: 'paiement.validate',
  FEE_CATEGORY_VIEW: 'categories_frais.view',
  FEE_CATEGORY_CREATE: 'categories_frais.create',
  FEE_CATEGORY_UPDATE: 'categories_frais.update',
  FEE_CATEGORY_DELETE: 'categories_frais.delete',
  INSTALLMENT_VIEW: 'tranches.view',
  INSTALLMENT_CREATE: 'tranches.create',
  INSTALLMENT_UPDATE: 'tranches.update',
  INSTALLMENT_DELETE: 'tranches.delete',
  FEE_VIEW: 'frais.view',
  FEE_CREATE: 'frais.create',
  FEE_UPDATE: 'frais.update',
  FEE_DELETE: 'frais.delete',
  CURRENCY_VIEW: 'devises.view',
  CURRENCY_CREATE: 'devises.create',
  CURRENCY_UPDATE: 'devises.update',
  CURRENCY_DELETE: 'devises.delete',
  EXCHANGE_RATE_VIEW: 'taux_de_change.view',
  EXCHANGE_RATE_CREATE: 'taux_de_change.create',
  EXCHANGE_RATE_UPDATE: 'taux_de_change.update',
  EXCHANGE_RATE_DELETE: 'taux_de_change.delete',
  FINANCIAL_STATEMENT_VIEW: 'etats_financiers.view',
  FINANCIAL_STATEMENT_PRINT: 'etats_financiers.print',
  FINANCIAL_STATEMENT_EXPORT: 'etats_financiers.export',
  CASH_OPEN: 'caisse.open',
  CASH_CLOSE: 'caisse.close',
  REMUNERATION_VIEW: 'remuneration.view',

  // -------------------------------------------------------------------------
  // RAPPORTS
  // -------------------------------------------------------------------------
  REPORTS_SECTION_VIEW: 'rapports.view',
  REPORT_VIEW: 'rapports.view',
  REPORT_PRINT: 'rapports.print',
  REPORT_EXPORT: 'rapports.export',
  BULLETIN_PRINT_VIEW: 'impression_des_bulletins.view',
  BULLETIN_PRINT: 'impression_des_bulletins.print',
  BULLETIN_VIEW: 'impression_des_bulletins.view',

  // -------------------------------------------------------------------------
  // ACCÈS
  // -------------------------------------------------------------------------
  ACCESS_SECTION_VIEW: 'acces.view',
  MODULE_VIEW: 'module.view',
  MODULE_CREATE: 'module.create',
  MODULE_UPDATE: 'module.update',
  MODULE_DELETE: 'module.delete',
  FEATURE_VIEW: 'fonctionnalites.view',
  FEATURE_CREATE: 'fonctionnalites.create',
  FEATURE_UPDATE: 'fonctionnalites.update',
  FEATURE_DELETE: 'fonctionnalites.delete',
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  PERMISSION_VIEW: 'permissions.view',
  PERMISSION_ASSIGN: 'permissions.assign',
  PERMISSION_UPDATE: 'permissions.update',
  PERMISSION_DELETE: 'permissions.delete',
  USER_VIEW: 'utilisateurs.view',
  USER_CREATE: 'utilisateurs.create',
  USER_UPDATE: 'utilisateurs.update',
  USER_DELETE: 'utilisateurs.delete',
  USER_RESET_PASSWORD: 'utilisateurs.reset_password',

  // -------------------------------------------------------------------------
  // GESTION AGENTS
  // -------------------------------------------------------------------------
  AGENTS_SECTION_VIEW: 'agents.view',
  AGENT_VIEW: 'agents.view',
  AGENT_LIST_VIEW: 'liste_des_agents.view',
  AGENT_CREATE: 'creer_un_agent.create',
  AGENT_UPDATE: 'agents.update',
  AGENT_DELETE: 'agents.delete',
  AGENT_STATS_VIEW: 'statistique_des_agents.view',

  // -------------------------------------------------------------------------
  // CONFIGURATION PÉDAGOGIQUE
  // -------------------------------------------------------------------------
  PEDAGOGICAL_CONFIG_SECTION_VIEW: 'configuration_pedagogique.view',
  DOMAIN_VIEW: 'domaines.view',
  DOMAIN_CREATE: 'domaines.create',
  DOMAIN_UPDATE: 'domaines.update',
  DOMAIN_DELETE: 'domaines.delete',
  SUBDOMAIN_VIEW: 'sous_domaines.view',
  SUBDOMAIN_CREATE: 'sous_domaines.create',
  SUBDOMAIN_UPDATE: 'sous_domaines.update',
  SUBDOMAIN_DELETE: 'sous_domaines.delete',
  SUBJECT_VIEW: 'branches.view',
  SUBJECT_CREATE: 'branches.create',
  SUBJECT_UPDATE: 'branches.update',
  SUBJECT_DELETE: 'branches.delete',
  PERIOD_VIEW: 'periodes_scolaires.view',
  PERIOD_CREATE: 'periodes_scolaires.create',
  PERIOD_UPDATE: 'periodes_scolaires.update',
  PERIOD_DELETE: 'periodes_scolaires.delete',
  TERM_VIEW: 'trimestres_semestres.view',
  TERM_CREATE: 'trimestres_semestres.create',
  TERM_UPDATE: 'trimestres_semestres.update',
  TERM_DELETE: 'trimestres_semestres.delete',
  CURRICULUM_VIEW: 'programme_pedagogique.view',
  CURRICULUM_CREATE: 'programme_pedagogique.create',
  CURRICULUM_UPDATE: 'programme_pedagogique.update',
  CURRICULUM_DELETE: 'programme_pedagogique.delete',
  CURRICULUM_SUBJECT_VIEW: 'matieres_programme.view',
  CURRICULUM_SUBJECT_CREATE: 'matieres_programme.create',
  CURRICULUM_SUBJECT_UPDATE: 'matieres_programme.update',
  CURRICULUM_SUBJECT_DELETE: 'matieres_programme.delete',
  CURSUS_VIEW: 'cursus.view',

  // -------------------------------------------------------------------------
  // CONFIGURATION
  // -------------------------------------------------------------------------
  CONFIGURATION_SECTION_VIEW: 'configuration.view',
  ACADEMIC_MODEL_VIEW: 'modele_academique.view',
  ACADEMIC_MODEL_CREATE: 'modele_academique.create',
  ACADEMIC_MODEL_UPDATE: 'modele_academique.update',
  ACADEMIC_MODEL_DELETE: 'modele_academique.delete',
  CYCLE_VIEW: 'cycle.view',
  CYCLE_CREATE: 'cycle.create',
  CYCLE_UPDATE: 'cycle.update',
  CYCLE_DELETE: 'cycle.delete',
  SECTION_VIEW: 'section.view',
  SECTION_CREATE: 'section.create',
  SECTION_UPDATE: 'section.update',
  SECTION_DELETE: 'section.delete',
  OPTION_VIEW: 'option.view',
  OPTION_CREATE: 'option.create',
  OPTION_UPDATE: 'option.update',
  OPTION_DELETE: 'option.delete',
  LEVEL_VIEW: 'niveau_scolaire.view',
  LEVEL_CREATE: 'niveau_scolaire.create',
  LEVEL_UPDATE: 'niveau_scolaire.update',
  LEVEL_DELETE: 'niveau_scolaire.delete',

  // -------------------------------------------------------------------------
  // ADMIN
  // -------------------------------------------------------------------------
  ADMIN_SECTION_VIEW: 'admin.view',
  GROUP_VIEW: 'groupe.view',
  GROUP_CREATE: 'groupe.create',
  GROUP_UPDATE: 'groupe.update',
  GROUP_DELETE: 'groupe.delete',
  SCHOOL_VIEW: 'ecole.view',
  SCHOOL_CREATE: 'ecole.create',
  SCHOOL_UPDATE: 'ecole.update',
  SCHOOL_DELETE: 'ecole.delete',
  SCHOOL_DETAILS_VIEW: 'details_ecole.view',
  ACADEMIC_YEAR_VIEW: 'annees_scolaires.view',
  ACADEMIC_YEAR_CREATE: 'annees_scolaires.create',
  ACADEMIC_YEAR_UPDATE: 'annees_scolaires.update',
  ACADEMIC_YEAR_DELETE: 'annees_scolaires.delete',

  // -------------------------------------------------------------------------
  // GESTION DES ACCÈS (footer)
  // -------------------------------------------------------------------------
  SETTINGS_SECTION_VIEW: 'gestion_des_acces.view',
  SETTINGS_VIEW: 'parametres_general.view',
  SETTINGS_UPDATE: 'parametres_general.update',
  SETTINGS_USERS_VIEW: 'parametres_utilisateurs.view',
  SETTINGS_SECURITY_VIEW: 'parametres_securite.view',
  AUDIT_VIEW: 'audit_logs.view'
} as const;

export type PermissionCode = (typeof P)[keyof typeof P] | string;

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(P);
