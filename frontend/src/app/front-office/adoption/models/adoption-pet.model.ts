export type PetType = 'CHIEN' | 'CHAT' | 'OISEAU' | 'LAPIN' | 'RONGEUR' | 'REPTILE' | 'POISSON' | 'AUTRE';
export type PetGender = 'MALE' | 'FEMELLE';
export type PetSize = 'PETIT' | 'MOYEN' | 'GRAND' | 'TRES_GRAND';

export interface AdoptionPet {
  id?: number;
  name: string;
  type: PetType;
  breed?: string;
  age?: number;
  gender?: PetGender;
  size?: PetSize;
  color?: string;
  healthStatus?: string;
  spayedNeutered?: boolean;
  specialNeeds?: string;
  description?: string;
  photos?: string;
  available?: boolean;
  shelterId?: number;
  shelterName?: string;
  createdAt?: Date;
  adoptedAt?: Date;
}