// ══════════════════════════════════════════════════════════════════════
// admin-event-form.component.ts
// Chemin : src/app/back-office/events/components/admin-event-form/
// ══════════════════════════════════════════════════════════════════════

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocationMapComponent } from './location-map.component';
import { AiDescriptionGeneratorComponent } from '../../components/ai-description-generator/ai-description-generator.component';
import { EventCoachComponent } from '../../components/event-coach/event-coach.component';
import { AdminToastContainerComponent } from '../../components/admin-toast-container/admin-toast-container.component';
import { AdminToastService } from '../../services/admin-toast.service';

import {
  AdminEventService,
  AdminCategoryService,
  AdminAuthService,
  AdminWeatherService,
  AdminEligibilityRuleService,
  AdminVirtualSessionService
} from '../../services/admin-api.service';
import { EventCategory, EventDetail, EventEligibilityRule } from '../../models/admin-events.models';

interface StepDef { label: string; sub: string; }

@Component({
  selector: 'app-admin-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, AiDescriptionGeneratorComponent, EventCoachComponent, LocationMapComponent, AdminToastContainerComponent],
  templateUrl: './admin-event-form.component.html',
  styleUrls: ['./admin-event-form.component.css']
})
export class AdminEventFormComponent implements OnInit {

  // ── Form data ──────────────────────────────────────────────────────
  form: any = {
    title: '', description: '', location: '',
    startDate: '', endDate: '',
    maxParticipants: 50, coverImageUrl: '', categoryId: null,
    price: null,
    expectedAnimalTypesText: '',
    isOnline: false,
    earlyAccessMinutes: 15,
    attendanceThreshold: 80,
    externalRoomUrl: ''
  };

  // ── État création session virtuelle ──────────────────────────────────
  virtualSessionCreating = false;
  virtualSessionCreated  = false;

  categories:   EventCategory[]       = [];
  weather:      any                   = null;
  isEdit        = false;
  eventId:      number | null         = null;
  loading       = false;
  error         = '';
  success       = '';
  touched       = false;

  // ── Image ──────────────────────────────────────────────────────────
  selectedImage: File | null  = null;
  imagePreview:  string | null = null;
  uploadingImage = false;

  // ── Stepper ────────────────────────────────────────────────────────
  currentStep = 0;
  steps: StepDef[] = [
    { label: 'General info',    sub: 'Title, category, image'  },
    { label: 'Date & location', sub: 'When and where'          },
    { label: 'Virtual session', sub: 'Online room config'      },
    { label: 'Eligibility',     sub: 'Who can participate'     },
    { label: 'Confirm',         sub: 'Review and publish'      }
  ];

  // ── Eligibility rules ──────────────────────────────────────────────
  inheritedRules:     EventEligibilityRule[]         = [];
  eventSpecificRules: Partial<EventEligibilityRule>[] = [];
  showAddRuleForm     = false;
  newRule: Partial<EventEligibilityRule & {
    listValues: string; numericValue: number; booleanValue: boolean
  }> = { hardReject: true, active: true, priority: 0, valueType: 'LIST' };

  readonly criteriaOptions = [
    { value: 'ALLOWED_BREEDS',        label: 'Allowed breeds',         icon: '🐾', type: 'LIST'    },
    { value: 'FORBIDDEN_BREEDS',      label: 'Forbidden breeds',       icon: '🚫', type: 'LIST'    },
    { value: 'ALLOWED_SPECIES',       label: 'Allowed species',        icon: '🦁', type: 'LIST'    },
    { value: 'MIN_AGE_MONTHS',        label: 'Minimum age (months)',   icon: '📅', type: 'NUMBER'  },
    { value: 'MAX_AGE_MONTHS',        label: 'Maximum age (months)',   icon: '📅', type: 'NUMBER'  },
    { value: 'MIN_WEIGHT_KG',         label: 'Minimum weight (kg)',    icon: '⚖️', type: 'NUMBER'  },
    { value: 'MAX_WEIGHT_KG',         label: 'Maximum weight (kg)',    icon: '⚖️', type: 'NUMBER'  },
    { value: 'VACCINATION_REQUIRED',  label: 'Vaccination required',   icon: '💉', type: 'BOOLEAN' },
    { value: 'LICENSE_REQUIRED',      label: 'License/Pedigree',       icon: '📜', type: 'BOOLEAN' },
    { value: 'MEDICAL_CERT_REQUIRED', label: 'Medical certificate',    icon: '🏥', type: 'BOOLEAN' },
    { value: 'ALLOWED_SEXES',         label: 'Allowed sexes',          icon: '⚧',  type: 'LIST'    },
    { value: 'STERILIZATION_REQUIRED',label: 'Sterilization required', icon: '✂️', type: 'BOOLEAN' },
  ];

  constructor(
    private route:           ActivatedRoute,
    private router:          Router,
    private eventService:    AdminEventService,
    private categoryService: AdminCategoryService,
    private weatherService:  AdminWeatherService,
    private ruleService:     AdminEligibilityRuleService,
    private virtualService:  AdminVirtualSessionService,
    private auth:            AdminAuthService,
    private toast:           AdminToastService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit  = true;
      this.eventId = +id;
      this.loadEvent(this.eventId);
    }
  }

  // ── AI Description callback ─────────────────────────────────────────

  onAiDescription(description: string): void {
    this.form.description = description;
    this.touched = true;
  }

  // ── Chargement données ─────────────────────────────────────────────

  loadCategories(): void {
    this.categoryService.getAll(this.auth.getAdminId()).subscribe({
      next: (c) => this.categories = c,
      error: ()  => this.toast.warning('Categories unavailable', 'Unable to load event categories right now.')
    });
  }

  loadEvent(id: number): void {
    this.eventService.getById(id).subscribe({
      next: (e: EventDetail) => {
        this.form = {
          title:                      e.title,
          description:                e.description,
          location:                   e.location,
          startDate:                  e.startDate?.slice(0, 16),
          endDate:                    e.endDate?.slice(0, 16),
          maxParticipants:            e.maxParticipants,
          coverImageUrl:              e.coverImageUrl,
          categoryId:                 e.category?.id,
          price:                      null,
          expectedAnimalTypesText:    '',
          isOnline:                   (e as any).isOnline ?? false,
          earlyAccessMinutes:         (e as any).earlyAccessMinutes ?? 15,
          attendanceThreshold:        (e as any).attendanceThresholdPercent ?? 80,
          externalRoomUrl:            (e as any).externalRoomUrl ?? ''
        };
        if (e.coverImageUrl)   this.imagePreview = e.coverImageUrl;
        if (e.category?.id)    this.loadInheritedRules(e.category.id);
        if (id)                this.loadEventRules(id);
        
        if ((e as any).isOnline && (e as any).virtualSession) {
          this.virtualSessionCreated = true;
        }
      }
    });
  }

  loadInheritedRules(categoryId: number): void {
    this.ruleService.getByCategory(categoryId).subscribe({
      next: (rules) => this.inheritedRules = rules,
      error: ()     => this.toast.warning('Rules unavailable', 'Category eligibility rules could not be loaded.')
    });
  }

  loadEventRules(eventId: number): void {
    this.ruleService.getByEvent(eventId).subscribe({
      next: (rules) => this.eventSpecificRules = rules,
      error: ()     => this.toast.warning('Rules unavailable', 'Event-specific eligibility rules could not be loaded.')
    });
  }

  // ── Stepper ────────────────────────────────────────────────────────

  goToStep(index: number): void {
    if (index <= this.currentStep) this.currentStep = index;
  }

  nextStep(): void {
    this.touched = true;
    if (this.currentStep === 0 && !this.step1Valid) return;
    if (this.currentStep === 1 && !this.step2Valid) return;
    this.touched = false;
    this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 0) { 
      this.currentStep--; 
      this.touched = false; 
    }
  }

  // ── Validation ────────────────────────────────────────────────────

  get step1Valid(): boolean {
    return !!(this.form.title && this.form.description && this.form.categoryId);
  }

  get isLocationRequired(): boolean {
    return !this.form.isOnline;
  }

  get step2Valid(): boolean {
    if (!this.form.startDate || !this.form.endDate) {
      return false;
    }

    if (!this.isLocationRequired) {
      return true;
    }

    return !!this.form.location?.trim();
  }

  get isValid(): boolean {
    if (!this.form.title?.trim()) return false;
    if (!this.form.categoryId) return false;
    if (!this.form.description?.trim()) return false;
    if (!this.form.startDate) return false;
    if (!this.form.endDate) return false;
    if (!this.form.maxParticipants || this.form.maxParticipants < 1) return false;
    if (this.isLocationRequired && !this.form.location?.trim()) return false;

    return true;
  }

  get validationWarnings(): string[] {
    const w: string[] = [];
    if (!this.form.title?.trim()) w.push('Event title is required');
    if (!this.form.description?.trim()) w.push('Description is required');
    if (!this.form.categoryId) w.push('Category is required');
    if (this.isLocationRequired && !this.form.location?.trim()) {
      w.push('Location is required for in-person events');
    }
    if (!this.form.startDate) w.push('Start date is required');
    if (!this.form.endDate) w.push('End date is required');
    if (!this.form.maxParticipants || this.form.maxParticipants < 1) {
      w.push('Max participants must be > 0');
    }
    return w;
  }

  // ── Catégorie ─────────────────────────────────────────────────────

  onCategoryChange(): void {
    this.form.categoryId
      ? this.loadInheritedRules(this.form.categoryId)
      : (this.inheritedRules = []);
  }

  setEventFormat(isOnline: boolean): void {
    if (this.form.isOnline === isOnline) {
      return;
    }

    this.form.isOnline = isOnline;

    if (isOnline) {
      this.form.location = '';
      this.weather = null;
    }
  }

  get selectedCategory(): EventCategory | null {
    return this.categories.find(c => c.id === this.form.categoryId) ?? null;
  }

  getCategoryDisplayIcon(icon: string | null | undefined): string {
    if (!icon) return '📅';

    const normalized = icon.trim().toLowerCase();
    const map: Record<string, string> = {
      calendar: '📅', event: '📅', date: '📅',
      competition: '🏆', trophy: '🏆', sport: '⚽', sports: '⚽',
      workshop: '🛠️', workshops: '🛠️', theater: '🎭', theatre: '🎭',
      music: '🎵', art: '🎨', pet: '🐾', pets: '🐾', animal: '🐾',
      book: '📚', books: '📚', tech: '💻', technology: '💻',
      train: '🚆', transport: '🚆', transit: '🚆', bus: '🚌', car: '🚗', travel: '✈️', trip: '✈️',
      meetup: '👥', community: '👥', social: '👥', food: '🍽️', health: '❤️',
      online: '🖥️', virtual: '🖥️', webinar: '🖥️'
    };

    if (map[normalized]) return map[normalized];
    if (normalized.startsWith('fa-') || normalized.startsWith('fas ') || normalized.startsWith('fa ')) return '📅';
    return '📅';
  }

  get inheritedRulesCount():  number { return this.inheritedRules.length; }
  get blockingRulesCount():   number { return this.getAllRules().filter(r => r.hardReject).length; }
  get warningRulesCount():    number { return this.getAllRules().filter(r => !r.hardReject).length; }

  isInherited(rule: any): boolean {
    return rule.id !== undefined && this.inheritedRules.some(r => r.id === rule.id);
  }

  // ── Règles d'éligibilité ───────────────────────────────────────────

  toggleAddRuleForm(): void {
    this.showAddRuleForm = !this.showAddRuleForm;
    if (!this.showAddRuleForm) this.resetNewRule();
  }

  resetNewRule(): void {
    this.newRule = {
      hardReject: true, active: true, priority: 0,
      valueType: 'LIST', criteria: undefined
    };
  }

  selectCriteria(opt: { value: string; type: string }): void {
    this.newRule.criteria     = opt.value as any;
    this.newRule.valueType    = opt.type as any;
    this.newRule.listValues   = '';
    this.newRule.numericValue = undefined;
    this.newRule.booleanValue = undefined;
  }

  addEventRule(): void {
    if (!this.newRule.criteria) return;
    const rule: any = {
      criteria:         this.newRule.criteria,
      valueType:        this.newRule.valueType,
      hardReject:       this.newRule.hardReject ?? true,
      active:           this.newRule.active ?? true,
      priority:         this.newRule.priority ?? 0,
    };
    if (this.isListCriteria()    && this.newRule.listValues)   rule.listValues   = this.newRule.listValues;
    if (this.isNumberCriteria()  && this.newRule.numericValue !== undefined) rule.numericValue = this.newRule.numericValue;
    if (this.isBooleanCriteria() && this.newRule.booleanValue !== undefined) rule.booleanValue = this.newRule.booleanValue;
    if (this.newRule.rejectionMessage) rule.rejectionMessage = this.newRule.rejectionMessage;
    this.eventSpecificRules.push(rule);
    this.toggleAddRuleForm();
  }

  removeEventRule(index: number): void { this.eventSpecificRules.splice(index, 1); }

  isListCriteria():    boolean { return ['ALLOWED_BREEDS','FORBIDDEN_BREEDS','ALLOWED_SPECIES','ALLOWED_SEXES','ALLOWED_COLORS','FORBIDDEN_COLORS'].includes(this.newRule.criteria || ''); }
  isNumberCriteria():  boolean { return ['MIN_AGE_MONTHS','MAX_AGE_MONTHS','MIN_WEIGHT_KG','MAX_WEIGHT_KG','MIN_EXPERIENCE_LEVEL'].includes(this.newRule.criteria || ''); }
  isBooleanCriteria(): boolean { return ['VACCINATION_REQUIRED','LICENSE_REQUIRED','MEDICAL_CERT_REQUIRED','STERILIZATION_REQUIRED'].includes(this.newRule.criteria || ''); }

  getCriteriaLabel(criteria: string | undefined): string {
    if (!criteria) return '—';
    return this.criteriaOptions.find(o => o.value === criteria)?.label ?? criteria;
  }

  parseRuleValues(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  getUnitFor(criteria: string | undefined): string {
    const units: Record<string, string> = {
      MIN_AGE_MONTHS: 'months', MAX_AGE_MONTHS: 'months',
      MIN_WEIGHT_KG:  'kg',     MAX_WEIGHT_KG:  'kg',
    };
    return criteria ? (units[criteria] || '') : '';
  }

  getUnit(): string {
    const units: Record<string, string> = {
      MIN_AGE_MONTHS: 'months',
      MAX_AGE_MONTHS: 'months',
      MIN_WEIGHT_KG: 'kg',
      MAX_WEIGHT_KG: 'kg',
      MIN_EXPERIENCE_LEVEL: '/5'
    };
    return units[this.newRule.criteria || ''] || '';
  }

  getAllRules(): any[] { return [...this.inheritedRules, ...this.eventSpecificRules]; }

  // ── Helpers UI ─────────────────────────────────────────────────────

  getDuration(): string {
    if (!this.form.startDate || !this.form.endDate) return '';
    const diff = new Date(this.form.endDate).getTime() - new Date(this.form.startDate).getTime();
    if (diff <= 0) return 'Invalid range';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h === 0) return `${m}min`;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  getWeatherEmoji(condition: string): string {
    const map: Record<string, string> = {
      SUNNY: '☀️', CLOUDY: '⛅', RAINY: '🌧️', STORMY: '⛈️', SNOWY: '❄️', UNKNOWN: '🌤️'
    };
    return map[condition] ?? '🌤️';
  }

  get minDate(): string { return new Date().toISOString().slice(0, 16); }

  get eventCoachForm(): { value: any; patchValue: (values: Record<string, any>) => void } {
    return {
      value: this.form,
      patchValue: (values: Record<string, any>) => {
        this.form = { ...this.form, ...values };
        this.touched = true;

        if ('location' in values || 'startDate' in values) {
          this.onDateChange();
          this.onLocationBlur();
        }
      }
    };
  }

  get canShowEventCoach(): boolean {
    if (!this.form.title?.trim()) {
      return false;
    }

    if (!this.form.startDate) {
      return false;
    }

    if (this.isLocationRequired) {
      return !!this.form.location?.trim();
    }

    return true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedImage = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result as string; };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreview  = null;
    this.form.coverImageUrl = '';
  }

  uploadImage(): void {
    if (!this.selectedImage) return;
    this.uploadingImage = true;
    this.error = '';
    const fd = new FormData();
    fd.append('file', this.selectedImage);
    this.eventService.uploadImage(fd).subscribe({
      next:  (r: { url: string }) => {
        this.form.coverImageUrl = `http://localhost:8087/elif${r.url}`;
        this.imagePreview       = this.form.coverImageUrl;
        this.uploadingImage     = false;
        this.selectedImage      = null;
        this.toast.success('Image uploaded', 'The event cover image is ready to use.');
      },
      error: () => {
        this.error = 'Failed to upload image';
        this.uploadingImage = false;
        this.toast.error('Upload failed', 'The cover image could not be uploaded.');
      }
    });
  }

  onLocationBlur(): void {
    if (!this.isLocationRequired || !this.form.location?.trim() || !this.form.startDate) return;
    
    const city = this.form.location.split(',').pop()?.trim() || this.form.location;
    const date = this.form.startDate.split('T')[0];
    
    this.weatherService.getWeatherByCityAndDate(city, date).subscribe({
      next: (w) => this.weather = w,
      error: () => {
        this.weather = null;
        this.toast.warning('Weather unavailable', 'Live weather data could not be loaded for this location and date.');
      }
    });
  }

  onDateChange(): void {
    if (this.isLocationRequired && this.form.location?.trim() && this.form.startDate) {
      this.onLocationBlur();
    }
  }

  // ── Sauvegarde ────────────────────────────────────────────────────

  save(): void {
    this.touched = true;
    if (!this.isValid) {
      this.error = 'Please fill all required fields';
      this.toast.warning('Missing information', 'Please complete all required event fields before saving.');
      return;
    }
    if (this.selectedImage && !this.form.coverImageUrl) {
      this.uploadImage();
      setTimeout(() => this.saveEvent(), 1200);
    } else {
      this.saveEvent();
    }
  }

  saveEvent(): void {
  this.loading = true;
  this.error   = '';
  this.success = '';

  const userId = this.auth.getAdminId();
  const fd     = new FormData();

  let locationValue = this.form.location?.trim();
  
  if (this.form.isOnline) {
    locationValue = 'Online Event';
  } else if (!locationValue) {
    this.error = 'Location is required for in-person events';
    this.loading = false;
    this.toast.warning('Location required', 'Add a location to publish an in-person event.');
    return;
  }

  fd.append('title',           this.form.title);
  fd.append('description',     this.form.description || '');
  fd.append('location',        locationValue);
  fd.append('startDate',       this.form.startDate);
  fd.append('endDate',         this.form.endDate);
  fd.append('maxParticipants', this.form.maxParticipants.toString());
  fd.append('categoryId',      this.form.categoryId.toString());
  fd.append('isOnline',        this.form.isOnline.toString());
  
  if (this.form.coverImageUrl) fd.append('coverImageUrl', this.form.coverImageUrl);
  if (this.selectedImage)      fd.append('image', this.selectedImage);

  const obs$ = this.isEdit && this.eventId
    ? this.eventService.updateWithImage(this.eventId, fd, userId)
    : this.eventService.createWithImage(fd, userId);

  obs$.subscribe({
    next: (savedEvent: any) => {
      this.loading = false;
      this.success = this.isEdit ? 'Event updated!' : 'Event created!';
      this.toast.success(
        this.isEdit ? 'Event updated' : 'Event created',
        this.isEdit
          ? 'Your event changes have been saved successfully.'
          : 'The new event has been created successfully.'
      );

      const savedId: number = savedEvent?.id || this.eventId;
      const tasks: Promise<any>[] = [];

      if (this.eventSpecificRules.length > 0 && savedId) {
        tasks.push(this.saveEventRulesPromise(savedId, userId));
      }

      if (this.form.isOnline && savedId && !this.isEdit && !this.virtualSessionCreated) {
        tasks.push(this.createVirtualSessionPromise(savedId, userId));
      }

      Promise.allSettled(tasks).then(() => {
        setTimeout(() => this.router.navigate(['/admin/events']), 1200);
      });
    },
    error: (err: any) => {
      this.loading = false;
      this.error   = err.error?.message || 'An error occurred. Please try again.';
      this.toast.error('Save failed', this.error);
    }
  });
}

  // ── Sauvegarde règles ─────────────────────────────────────────────

  private saveEventRulesPromise(eventId: number, userId: number): Promise<void> {
    const saves = this.eventSpecificRules
      .filter(rule => rule.criteria && rule.valueType)
      .map(rule => {
        const body: any = {
          eventId, criteria: rule.criteria, valueType: rule.valueType,
          hardReject: rule.hardReject ?? true, active: rule.active ?? true,
          priority: rule.priority ?? 0,
        };
        if (rule.valueType === 'LIST'    && (rule as any).listValues)   body.listValues   = (rule as any).listValues;
        if (rule.valueType === 'NUMBER'  && (rule as any).numericValue != null) body.numericValue = (rule as any).numericValue;
        if (rule.valueType === 'BOOLEAN' && (rule as any).booleanValue != null) body.booleanValue = (rule as any).booleanValue;
        if ((rule as any).rejectionMessage) body.rejectionMessage = (rule as any).rejectionMessage;
        return this.ruleService.create(body, userId).toPromise();
      });
    return Promise.allSettled(saves).then(() => {});
  }

  // ── Création session virtuelle ────────────────────────────────────

  private createVirtualSessionPromise(eventId: number, adminId: number): Promise<void> {
    this.virtualSessionCreating = true;
    
    const request = {
      earlyAccessMinutes: Number(this.form.earlyAccessMinutes) || 15,
      attendanceThresholdPercent: Number(this.form.attendanceThreshold) || 80,
      externalRoomUrl: this.form.externalRoomUrl?.trim() || null
    };
    
    return this.virtualService.createSession(eventId, adminId, request)
      .toPromise()
      .then(() => {
        this.virtualSessionCreated = true;
        this.virtualSessionCreating = false;
        this.toast.success('Virtual session ready', 'Attendance tracking and certificate settings are now active.');
      })
      .catch(() => {
        this.virtualSessionCreating = false;
        this.toast.warning('Virtual session pending', 'The event was saved, but the virtual session could not be created automatically.');
        return Promise.resolve();
      });
  }

  onLocationSelected(location: string) {
    if (!this.isLocationRequired) return;
    this.form.location = location?.trim() ?? '';
    if (this.form.location) {
      this.onLocationBlur();
    }
  }

}