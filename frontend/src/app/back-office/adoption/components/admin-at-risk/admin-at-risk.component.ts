import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AtRiskService, AtRiskPet, AtRiskStats } from '../../services/at-risk.service';  // ✅ AJOUTER AtRiskStats

@Component({
  selector: 'app-admin-at-risk',
  templateUrl: './admin-at-risk.component.html',
  styleUrls: ['./admin-at-risk.component.css']
})
export class AdminAtRiskComponent implements OnInit {

  pets: AtRiskPet[]      = [];
  stats: AtRiskStats | null = null;
  loading  = true;
  error: string | null = null;

  selectedLevel   = '';
  selectedShelter = '';
  searchTerm      = '';

  expandedPetId: number | null = null;

  constructor(private atRiskService: AtRiskService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.atRiskService.getAll().subscribe({
      next: (data: AtRiskPet[]) => {  // ✅ AJOUTER le type
        this.pets = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error loading data';
        this.loading = false;
      }
    });
    this.atRiskService.getStats().subscribe({
      next: (s: AtRiskStats) => {  // ✅ AJOUTER le type
        this.stats = s;
      },
      error: () => {}
    });
  }

  get shelters(): string[] {
    return [...new Set(this.pets.map(p => p.shelterName).filter(Boolean))];
  }

  get filtered(): AtRiskPet[] {
    let r = [...this.pets];
    if (this.selectedLevel)   r = r.filter(p => p.riskLevel === this.selectedLevel);
    if (this.selectedShelter) r = r.filter(p => p.shelterName === this.selectedShelter);
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      r = r.filter(p => p.petName?.toLowerCase().includes(q) ||
                        p.shelterName?.toLowerCase().includes(q) ||
                        p.petType?.toLowerCase().includes(q));
    }
    return r;
  }

  get critical(): number { return this.pets.filter(p => p.riskLevel === 'CRITICAL').length; }
  get atRisk():   number { return this.pets.filter(p => p.riskLevel === 'AT_RISK').length; }
  get watch():    number { return this.pets.filter(p => p.riskLevel === 'WATCH').length; }

  toggleExpand(petId: number): void {
    this.expandedPetId = this.expandedPetId === petId ? null : petId;
  }

  clearFilters(): void {
    this.selectedLevel = '';
    this.selectedShelter = '';
    this.searchTerm = '';
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
}