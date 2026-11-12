import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../auth/auth.service';
import { ShelterService } from '../../services/shelter.service';
import { AtRiskService, AtRiskPet } from '../../services/at-risk.service';
@Component({
  selector: 'app-shelter-at-risk',
  templateUrl: './shelter-at-risk.component.html',
  styleUrls: ['./shelter-at-risk.component.css']
})
export class ShelterAtRiskComponent implements OnInit {

  pets: AtRiskPet[] = [];
  loading = true;
  error: string | null = null;
  shelterId: number | null = null;

  // Filtre niveau
  selectedLevel = '';
  expandedPetId: number | null = null; // Pour l'accordéon des recommandations

  constructor(
    private authService: AuthService,
    private shelterService: ShelterService,
    private atRiskService: AtRiskService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'SHELTER') {
      this.router.navigate(['/']);
      return;
    }
    this.shelterService.getShelterByUserId(user.id).subscribe({
      next: (shelter) => {
        this.shelterId = shelter.id ?? null;
        this.load();
      },
      error: () => { this.error = 'Shelter not found'; this.loading = false; }
    });
  }

  load(): void {
    if (!this.shelterId) return;
    this.loading = true;
    this.atRiskService.getByShelter(this.shelterId).subscribe({
      next: (data) => { this.pets = data; this.loading = false; },
      error: () => { this.error = 'Error loading data'; this.loading = false; }
    });
  }

  get filtered(): AtRiskPet[] {
    if (!this.selectedLevel) return this.pets;
    return this.pets.filter(p => p.riskLevel === this.selectedLevel);
  }

  get critical(): number { return this.pets.filter(p => p.riskLevel === 'CRITICAL').length; }
  get atRisk():   number { return this.pets.filter(p => p.riskLevel === 'AT_RISK').length; }
  get watch():    number { return this.pets.filter(p => p.riskLevel === 'WATCH').length; }
  get safe():     number { return this.pets.filter(p => p.riskLevel === 'SAFE').length; }

  toggleExpand(petId: number): void {
    this.expandedPetId = this.expandedPetId === petId ? null : petId;
  }

  getLevelLabel(level: string): string {
    const m: any = { CRITICAL:'🔴 Critical', AT_RISK:'🟠 At Risk', WATCH:'🟡 Watch', SAFE:'🟢 Safe' };
    return m[level] || level;
  }

  getLevelClass(level: string): string {
    const m: any = { CRITICAL:'lvl-critical', AT_RISK:'lvl-atrisk', WATCH:'lvl-watch', SAFE:'lvl-safe' };
    return m[level] || '';
  }

  getFirstPhoto(photos: string | null | undefined): string {
    if (!photos) return '';
    try {
      const arr = JSON.parse(photos);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : '';
    } catch { return photos; }
  }

  editPet(petId: number): void {
    this.router.navigate(['/app/adoption/shelter/pets/edit', petId]);
  }

  viewRequests(petId: number): void {
    this.router.navigate(['/app/adoption/shelter/requests'], { queryParams: { petId } });
  }
}