export type ContractStatus = 'BROUILLON' | 'ENVOYE' | 'SIGNE' | 'VALIDE' | 'ACTIF' | 'RESILIE' | 'ANNULE' | 'TERMINE';

export interface Contract {
  id?: number;
  numeroContrat?: string;
  shelterId: number;
  shelterName?: string;
  adoptantId: number;
  adoptantName?: string;
  animalId: number;
  animalName?: string;
  dateSignature?: Date;
  dateAdoption?: Date;
  statut?: ContractStatus;
  conditionsGenerales?: string;
  conditionsSpecifiques?: string;
  fraisAdoption?: number;
  documentUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}