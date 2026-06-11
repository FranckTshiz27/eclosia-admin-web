import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';


export interface FamilyMember {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: 'M' | 'F' | '';
  lieuNaissance: string;
  dateNaissance: string;
  degre: string;
}

export interface Cursus {
  etablissement: string;
  departement: string;
  specialisation: string;
  niveau: string;
  dateDebut: string;
  dateFin: string;
  titre: string;
  resultat: string;
  bourse: string;
}

export interface Agent {
  id: number;
  nom: string;
  postnom: string;
  prenom: string;
  matricule: string;
  sexe: 'M' | 'F';
  etatCivil: string;
  service: string;
  grade: string;
  fonction: string;
  dateNaissance: string;
  lieuNaissance: string;
  commune: string;
  adresse: string;
  email: string;
  tel1: string;
  tel2?: string;
  dateEntree: string;
  anciennete: string;
  nombrePromotions: number;
  photo?: string;
  cursusEtablissement?: string;
  cursusNiveau?: string;
  cursusTitre?: string;
  remunerationType?: string;
  remunerationMontant?: string;
  province?: string;
  direction?: string;
  familyMembers?: FamilyMember[];
  cursusList?: Cursus[];
}

@Injectable({
  providedIn: 'root'
})
export class AgentsService {

  private agents: Agent[] = [
    { 
      id: 1, 
      nom: 'MWENGE', 
      postnom: 'MUGANZA', 
      prenom: 'Alexandre', 
      matricule: '123456789094', 
      sexe: 'M', 
      etatCivil: 'Marié', 
      service: 'Direction Générale', 
      grade: 'A2', 
      fonction: 'Directeur', 
      dateNaissance: '03/03/1989', 
      lieuNaissance: 'Lubumbashi', 
      commune: 'Ngaliema', 
      adresse: 'Binza Ozone', 
      email: 'amwenge@fonpub.cd', 
      tel1: '+243812345678', 
      tel2: '+243997654321', 
      dateEntree: '03/03/1989', 
      anciennete: '35 ans', 
      nombrePromotions: 4, 
      cursusEtablissement: 'UNILU', 
      cursusNiveau: 'Licencié', 
      cursusTitre: 'Droit', 
      remunerationType: 'Kinshasa', 
      remunerationMontant: '1500 USD',
      province: 'Haut-Katanga',
      direction: 'Direction Générale'
    },
    { id: 2, nom: 'KABALA', postnom: 'NTUMBA', prenom: 'Marie-Claire', matricule: '987654321001', sexe: 'F', etatCivil: 'Mariée', service: 'Ressources Humaines', grade: 'A1', fonction: 'Chef de Bureau', dateNaissance: '15/06/1985', lieuNaissance: 'Kinshasa', commune: 'Lemba', adresse: 'Av. Kasa-Vubu', email: 'mkabila@fonpub.cd', tel1: '+243823456789', dateEntree: '01/09/2005', anciennete: '20 ans', nombrePromotions: 3 },
    { id: 3, nom: 'TSHISEKEDI', postnom: 'LUMUMBA', prenom: 'Jean-Baptiste', matricule: '112233445566', sexe: 'M', etatCivil: 'Célibataire', service: 'Finance', grade: 'B1', fonction: 'Agent Comptable', dateNaissance: '22/11/1992', lieuNaissance: 'Mbuji-Mayi', commune: 'Kalamu', adresse: 'Av. Victoire', email: 'jbtshisekedi@fonpub.cd', tel1: '+243834567890', dateEntree: '15/02/2015', anciennete: '10 ans', nombrePromotions: 2 },
    { id: 4, nom: 'KASONGO', postnom: 'BANZA', prenom: 'Patience', matricule: '223344556677', sexe: 'F', etatCivil: 'Célibataire', service: 'Informatique', grade: 'A2', fonction: 'Administrateur Système', dateNaissance: '08/04/1990', lieuNaissance: 'Kisangani', commune: 'Gombe', adresse: 'Av. de la Paix', email: 'pkasongo@fonpub.cd', tel1: '+243845678901', dateEntree: '10/06/2012', anciennete: '13 ans', nombrePromotions: 2 },
    { id: 5, nom: 'MUKENDI', postnom: 'KALALA', prenom: 'David', matricule: '334455667788', sexe: 'M', etatCivil: 'Marié', service: 'Juridique', grade: 'A1', fonction: 'Conseiller Juridique', dateNaissance: '30/09/1980', lieuNaissance: 'Kananga', commune: 'Matete', adresse: 'Av. Lumumba', email: 'dmukendi@fonpub.cd', tel1: '+243856789012', dateEntree: '01/01/2003', anciennete: '22 ans', nombrePromotions: 5 },
    { id: 6, nom: 'NGALULA', postnom: 'MBIMBA', prenom: 'Sandrine', matricule: '445566778899', sexe: 'F', etatCivil: 'Mariée', service: 'Communication', grade: 'B2', fonction: 'Chargée de Communication', dateNaissance: '14/01/1995', lieuNaissance: 'Kinshasa', commune: 'Barumbu', adresse: 'Av. Bokasa', email: 'sngalula@fonpub.cd', tel1: '+243867890123', dateEntree: '03/04/2018', anciennete: '7 ans', nombrePromotions: 1 },
    { id: 7, nom: 'ILUNGA', postnom: 'NKULU', prenom: 'Patrick', matricule: '556677889900', sexe: 'M', etatCivil: 'Divorcé', service: 'Audit Interne', grade: 'A2', fonction: 'Auditeur Senior', dateNaissance: '05/07/1977', lieuNaissance: 'Likasi', commune: 'Kinshasa', adresse: 'Av. du Flambeau', email: 'pilunga@fonpub.cd', tel1: '+243878901234', dateEntree: '15/05/1999', anciennete: '26 ans', nombrePromotions: 6 },
    { id: 8, nom: 'MBUYI', postnom: 'KABUYA', prenom: 'Christelle', matricule: '667788990011', sexe: 'F', etatCivil: 'Célibataire', service: 'Ressources Humaines', grade: 'B1', fonction: 'Gestionnaire RH', dateNaissance: '19/12/1993', lieuNaissance: 'Kolwezi', commune: 'Ndjili', adresse: 'Av. Itaga', email: 'cmbuyi@fonpub.cd', tel1: '+243889012345', dateEntree: '02/09/2016', anciennete: '9 ans', nombrePromotions: 1 },
    { id: 9, nom: 'KAYUMBA', postnom: 'NSIMBA', prenom: 'Emmanuel', matricule: '778899001122', sexe: 'M', etatCivil: 'Marié', service: 'Direction Générale', grade: 'A1', fonction: 'Secrétaire Général', dateNaissance: '28/02/1970', lieuNaissance: 'Goma', commune: 'Gombe', adresse: 'Av. Colonel Tshatshi', email: 'ekayumba@fonpub.cd', tel1: '+243890123456', dateEntree: '01/07/1995', anciennete: '30 ans', nombrePromotions: 8 },
    { id: 10, nom: 'LUTETE', postnom: 'MBOKO', prenom: 'Angélique', matricule: '889900112233', sexe: 'F', etatCivil: 'Veuve', service: 'Finance', grade: 'A2', fonction: 'Chef de Service', dateNaissance: '11/05/1975', lieuNaissance: 'Kinshasa', commune: 'Kintambo', adresse: 'Av. 24 Novembre', email: 'alutete@fonpub.cd', tel1: '+243901234567', dateEntree: '10/01/1998', anciennete: '27 ans', nombrePromotions: 5 },
    { id: 11, nom: 'BOLAMBA', postnom: 'EKANGA', prenom: 'Franck', matricule: '990011223344', sexe: 'M', etatCivil: 'Célibataire', service: 'Informatique', grade: 'B2', fonction: 'Développeur', dateNaissance: '03/08/1997', lieuNaissance: 'Kinshasa', commune: 'Lingwala', adresse: 'Av. du Commerce', email: 'fbolamba@fonpub.cd', tel1: '+243912345678', dateEntree: '15/09/2020', anciennete: '5 ans', nombrePromotions: 0 },
    { id: 12, nom: 'MASAMBA', postnom: 'KIALA', prenom: 'Jeanne', matricule: '001122334455', sexe: 'F', etatCivil: 'Mariée', service: 'Juridique', grade: 'A1', fonction: 'Juriste', dateNaissance: '21/10/1988', lieuNaissance: 'Mbandaka', commune: 'Bumbu', adresse: 'Av. Libération', email: 'jmasamba@fonpub.cd', tel1: '+243923456789', dateEntree: '05/03/2010', anciennete: '15 ans', nombrePromotions: 3 },
    { id: 13, nom: 'NDONGA', postnom: 'LIKAMBO', prenom: 'Blaise', matricule: '111222333444', sexe: 'M', etatCivil: 'Marié', service: 'Audit Interne', grade: 'B1', fonction: 'Auditeur Junior', dateNaissance: '17/03/1994', lieuNaissance: 'Kikwit', commune: 'Masina', adresse: 'Av. Pétro Congo', email: 'bndonga@fonpub.cd', tel1: '+243934567890', dateEntree: '20/11/2017', anciennete: '8 ans', nombrePromotions: 1 },
    { id: 14, nom: 'WETSHI', postnom: 'LOMAMI', prenom: 'Cynthia', matricule: '222333444555', sexe: 'F', etatCivil: 'Célibataire', service: 'Communication', grade: 'A2', fonction: 'Directrice Communication', dateNaissance: '09/09/1982', lieuNaissance: 'Bunia', commune: 'Gombe', adresse: 'Av. Wangata', email: 'cwetshi@fonpub.cd', tel1: '+243945678901', dateEntree: '01/09/2006', anciennete: '19 ans', nombrePromotions: 4 },
    { id: 15, nom: 'MONGA', postnom: 'BAKULU', prenom: 'Roger', matricule: '333444555666', sexe: 'M', etatCivil: 'Marié', service: 'Ressources Humaines', grade: 'A2', fonction: 'DRH Adjoint', dateNaissance: '25/12/1979', lieuNaissance: 'Matadi', commune: 'Mont-Ngafula', adresse: 'Av. Pins', email: 'rmonga@fonpub.cd', tel1: '+243956789012', dateEntree: '30/06/2001', anciennete: '24 ans', nombrePromotions: 5 },
  ];

  getAgents(): Agent[] {
    return this.agents;
  }

  getServices(): string[] {
    return [...new Set(this.agents.map(a => a.service))].sort();
  }

  getDirections(): string[] {
    return [...new Set(this.agents.map(a => a.direction || a.service))].sort();
  }

  getProvinces(): string[] {
    return [...new Set(this.agents.map(a => a.province || 'Kinshasa'))].sort();
  }

  getGrades(): string[] {
    return [...new Set(this.agents.map(a => a.grade))].sort();
  }

  getLevels(): string[] {
    return [...new Set(this.agents.map(a => a.cursusNiveau || 'Licencié'))].sort();
  }

  exportToExcel(agents: Agent[]): void {
    const data = agents.map((a, i) => ({
      '#': i + 1,
      'Matricule': a.matricule,
      'Nom': a.nom,
      'Post-Nom': a.postnom,
      'Prénom': a.prenom,
      'Sexe': a.sexe,
      'État Civil': a.etatCivil,
      'Service': a.service,
      'Grade': a.grade,
      'Fonction': a.fonction,
      'Date de Naissance': a.dateNaissance,
      'Lieu de Naissance': a.lieuNaissance,
      'Commune': a.commune,
      'Adresse': a.adresse,
      'Email': a.email,
      'Téléphone 1': a.tel1,
      'Téléphone 2': a.tel2 || '',
      'Date d\'Entrée': a.dateEntree,
      'Ancienneté': a.anciennete,
      'Promotions': a.nombrePromotions
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    // Style colonnes largeur
    ws['!cols'] = [
      { wch: 5 }, { wch: 16 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 25 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 25 },
      { wch: 16 }, { wch: 16 }, { wch: 15 }, { wch: 12 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Liste des Agents');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const date = new Date().toISOString().slice(0, 10);

    // Télécharger le fichier
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `liste_agents_${date}.xlsx`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  addAgent(agent: Agent): void {
    const maxId = this.agents.length > 0 ? Math.max(...this.agents.map(a => a.id)) : 0;
    agent.id = maxId + 1;
    this.agents.push(agent);
  }

  updateAgent(agent: Agent): void {
    const index = this.agents.findIndex(a => a.id === agent.id);
    if (index !== -1) {
      this.agents[index] = agent;
    }
  }
}
