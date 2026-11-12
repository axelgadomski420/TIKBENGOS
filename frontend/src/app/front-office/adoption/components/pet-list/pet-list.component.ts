import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PetService } from '../../services/pet.service';
import { AuthService } from '../../../../auth/auth.service';
import { AtRiskService, AtRiskPet } from '../../services/at-risk.service';
import { ContractService } from '../../services/contract.service';
import { AdoptionPet } from '../../models/adoption-pet.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-pet-list',
  templateUrl: './pet-list.component.html',
  styleUrls: ['./pet-list.component.css']
})
export class PetListComponent implements OnInit {

  pets: AdoptionPet[]  = [];
  loading   = true;
  error: string | null = null;
  isLoggedIn = false;

  // Badge nouveaux contrats
  newContractsCount = 0;
  private SEEN_KEY  = '';

  // Map petId → AtRiskPet
  atRiskMap: Map<number, AtRiskPet> = new Map();

  // Modale info at-risk
  showRiskModal     = false;
  selectedRiskPet: AtRiskPet | null = null;

  filters = { type: '', size: '' };

  constructor(
    private petService: PetService,
    private authService: AuthService,
    private atRiskService: AtRiskService,
    private contractService: ContractService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadAll();

    // Compter les nouveaux contrats si connecté en tant qu'USER
    const user = this.authService.getCurrentUser();
    if (user && user.role === 'USER') {
      this.SEEN_KEY = `seen_contracts_${user.id}`;
      this.checkNewContracts(user.id);
    }
  }

  // ============================================================
  // BADGE NOUVEAUX CONTRATS
  // ============================================================

  checkNewContracts(userId: number): void {
    this.contractService.getByAdopter(userId).subscribe({
      next: (contracts) => {
        const seenRaw = localStorage.getItem(this.SEEN_KEY);
        const seenIds: number[] = seenRaw ? JSON.parse(seenRaw) : [];
        this.newContractsCount = contracts.filter(c => !seenIds.includes(c.id)).length;
      },
      error: () => { this.newContractsCount = 0; }
    });
  }

  // ============================================================
  // CHARGEMENT
  // ============================================================

  loadAll(): void {
    this.loading = true;
    forkJoin({
      pets:   this.petService.getAvailable(),
      atRisk: this.atRiskService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ pets, atRisk }) => {
        this.atRiskMap = new Map();
        (atRisk as AtRiskPet[]).forEach(r => this.atRiskMap.set(r.petId, r));

        const order: any = { CRITICAL: 0, AT_RISK: 1, WATCH: 2 };
        this.pets = (pets as AdoptionPet[]).sort((a, b) => {
          const ra = this.atRiskMap.get(a.id!);
          const rb = this.atRiskMap.get(b.id!);
          const oa = ra ? (order[ra.riskLevel] ?? 3) : 3;
          const ob = rb ? (order[rb.riskLevel] ?? 3) : 3;
          return oa - ob;
        });
        this.loading = false;
      },
      error: () => { this.error = 'Error loading animals'; this.loading = false; }
    });
  }

  search(): void {
    this.loading = true;
    this.petService.search(this.filters).subscribe({
      next: (data) => { this.pets = data as AdoptionPet[]; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  resetFilters(): void {
    this.filters = { type: '', size: '' };
    this.loadAll();
  }

  // ============================================================
  // AT-RISK
  // ============================================================

  getAtRisk(petId: number): AtRiskPet | undefined { return this.atRiskMap.get(petId); }

  hasRisk(petId: number): boolean {
    const r = this.atRiskMap.get(petId);
    return !!r && r.riskLevel !== 'SAFE';
  }

  getClientRiskLabel(level: string): string {
    const m: any = { CRITICAL:'💛 Needs a Home Urgently', AT_RISK:'🧡 Waiting a Long Time', WATCH:'💙 Still Looking' };
    return m[level] || '';
  }

  getClientRiskClass(level: string): string {
    const m: any = { CRITICAL:'risk-urgent', AT_RISK:'risk-waiting', WATCH:'risk-looking' };
    return m[level] || '';
  }

  openRiskInfo(petId: number, event: Event): void {
    event.stopPropagation();
    this.selectedRiskPet = this.atRiskMap.get(petId) || null;
    this.showRiskModal   = true;
  }

  closeRiskModal(): void { this.showRiskModal = false; this.selectedRiskPet = null; }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goToShelters():    void { this.router.navigate(['/app/adoption/shelters']); }
  goToMyRequests():  void { this.router.navigate(['/app/adoption/my-requests']); }
  goToMyContracts(): void { this.router.navigate(['/app/adoption/my-contracts']); }
  goToWizard():      void { this.router.navigate(['/app/adoption/find-my-pet']); }

  checkAdopt(pet: AdoptionPet): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/app/adoption/pets', pet.id, 'adopt']);
    } else {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  getPetTypeLabel(type: string): string {
    const m: any = { CHIEN:'🐕 Dog', CHAT:'🐈 Cat', OISEAU:'🐦 Bird',
      LAPIN:'🐇 Rabbit', RONGEUR:'🐭 Rodent', REPTILE:'🐍 Reptile',
      POISSON:'🐟 Fish', AUTRE:'🐾 Other' };
    return m[type] || type;
  }

  getPetSizeLabel(size: string): string {
    const m: any = { PETIT:'Small', MOYEN:'Medium', GRAND:'Large', TRES_GRAND:'Extra Large' };
    return m[size] || size;
  }

  getFirstPhoto(photos: string | null | undefined): string {
    if (!photos) return '';
    try {
      const arr = JSON.parse(photos);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : '';
    } catch { return photos; }
  }
}