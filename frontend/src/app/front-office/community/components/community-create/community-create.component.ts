import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityService } from '../../services/community.service';
import { AuthService } from '../../../../auth/auth.service';
import { Community, CommunityRule, Flair } from '../../models/community.model';

@Component({
  selector: 'app-community-create',
  templateUrl: './community-create.component.html',
  styleUrl: './community-create.component.css'
})
export class CommunityCreateComponent {
  private readonly bannerPalette = ['#A7E1D8', '#FCD6A0', '#F9B3B9', '#B7D7F7', '#CBB8F4', '#BFE8C3', '#F7D5E6', '#F6E6A8'];
  private readonly previewSeed = Math.floor(Math.random() * 1000000);

  get userId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  stage: 1 | 2 | 3 | 4 = 1;
  saving = false;
  error = '';
  createdCommunity?: Community;
  createdRules: CommunityRule[] = [];
  createdFlairs: Flair[] = [];
  creatingRule = false;
  creatingFlair = false;
  ruleError = '';
  flairError = '';
  newRuleTitle = '';
  newRuleDescription = '';
  newFlairName = '';
  newFlairColor = '#3A9282';
  newFlairTextColor = '#FFFFFF';
  bannerPreview = '';
  iconPreview = '';
  bannerInputId = 'community-banner-input';
  iconInputId = 'community-icon-input';

  form;

  get nameLength(): number {
    return String(this.form.get('name')?.value || '').length;
  }

  get descriptionLength(): number {
    return String(this.form.get('description')?.value || '').length;
  }

  get typeLabel(): string {
    return this.form.get('type')?.value === 'PRIVATE' ? 'Private' : 'Public';
  }

  get stageTitle(): string {
    if (this.stage === 1) return 'Basics';
    if (this.stage === 2) return 'Rules';
    if (this.stage === 3) return 'Flairs';
    return 'Launch';
  }

  get flairNameLength(): number {
    return this.newFlairName.trim().length;
  }

  get slugPreview(): string {
    const rawValue = String(this.form.get('name')?.value || '').trim().toLowerCase();
    const slug = rawValue
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return slug || 'community-name';
  }

  get previewInitial(): string {
    const name = String(this.form.get('name')?.value || '').trim();
    return name.charAt(0).toUpperCase() || 'C';
  }

  get setupChecklist(): Array<{ label: string; done: boolean; hint: string }> {
    return [
      {
        label: 'Identity',
        done: this.nameLength >= 3,
        hint: 'A clear name helps people find and trust the space.'
      },
      {
        label: 'Purpose',
        done: this.descriptionLength >= 20,
        hint: 'A strong description sets the scope and tone.'
      },
      {
        label: 'Access',
        done: !!this.form.get('type')?.value,
        hint: 'Choose whether anyone can join or access stays curated.'
      },
      {
        label: 'Branding',
        done: !!(this.form.get('iconUrl')?.value || this.form.get('bannerUrl')?.value),
        hint: 'Optional, but visuals make the community feel established.'
      }
    ];
  }

  get completedChecklistCount(): number {
    return this.setupChecklist.filter((item) => item.done).length;
  }

  constructor(
    private fb: FormBuilder,
    private communityService: CommunityService,
    private router: Router,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      type: ['PUBLIC'],
      bannerUrl: [''],
      iconUrl: ['']
    });
  }

  onImagePicked(event: Event, controlName: 'bannerUrl' | 'iconUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      this.form.patchValue({ [controlName]: value });
      if (controlName === 'bannerUrl') this.bannerPreview = value;
      if (controlName === 'iconUrl') this.iconPreview = value;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearPickedImage(controlName: 'bannerUrl' | 'iconUrl'): void {
    this.form.patchValue({ [controlName]: '' });
    if (controlName === 'bannerUrl') this.bannerPreview = '';
    if (controlName === 'iconUrl') this.iconPreview = '';
  }

  createCommunityAndContinue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.createdCommunity) {
      this.stage = 2;
      return;
    }

    this.saving = true;
    this.error = '';
    const bannerUrl = this.cleanOptional(this.form.value.bannerUrl);
    const iconUrl = this.cleanOptional(this.form.value.iconUrl);
    const imageValidationError = this.validateCommunityImageSize(bannerUrl, iconUrl);
    if (imageValidationError) {
      this.error = imageValidationError;
      this.saving = false;
      return;
    }

    const payload: { name: string; description: string; type: 'PUBLIC' | 'PRIVATE'; bannerUrl?: string; iconUrl?: string } = {
      name: this.form.value.name ?? '',
      description: this.form.value.description ?? '',
      type: (this.form.value.type as 'PUBLIC' | 'PRIVATE') ?? 'PUBLIC',
      bannerUrl,
      iconUrl
    };

    this.communityService.create(payload, userId).subscribe({
      next: (community) => {
        this.createdCommunity = community;
        this.stage = 2;
        this.saving = false;
      },
      error: (error) => {
        this.error = this.readErrorMessage(error, 'Could not create community.');
        this.saving = false;
      }
    });
  }

  addRuleAndStay(): void {
    if (!this.createdCommunity) {
      this.error = 'Create the community first.';
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const title = this.newRuleTitle.trim();
    const description = this.newRuleDescription.trim();
    if (!title) {
      this.ruleError = 'Rule title is required.';
      return;
    }

    this.creatingRule = true;
    this.ruleError = '';
    const nextRuleOrder = (this.createdRules.reduce((max, rule) => Math.max(max, rule.ruleOrder || 0), 0) || 0) + 1;
    this.communityService.addRule(this.createdCommunity.id, {
      title,
      description,
      ruleOrder: nextRuleOrder
    }, userId).subscribe({
      next: (rule) => {
        this.createdRules = [...this.createdRules, rule].sort((a, b) => (a.ruleOrder || 0) - (b.ruleOrder || 0));
        this.newRuleTitle = '';
        this.newRuleDescription = '';
        this.creatingRule = false;
      },
      error: (error) => {
        this.ruleError = this.readErrorMessage(error, 'Could not add rule.');
        this.creatingRule = false;
      }
    });
  }

  addFlairAndStay(): void {
    if (!this.createdCommunity) {
      this.error = 'Create the community first.';
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const name = this.newFlairName.trim();
    if (!name) {
      this.flairError = 'Flair name is required.';
      return;
    }

    this.creatingFlair = true;
    this.flairError = '';
    this.communityService.addFlair(this.createdCommunity.id, {
      name,
      color: this.newFlairColor,
      textColor: this.newFlairTextColor
    }, userId).subscribe({
      next: (flair) => {
        this.createdFlairs = [...this.createdFlairs, flair];
        this.newFlairName = '';
        this.newFlairColor = '#3A9282';
        this.newFlairTextColor = '#FFFFFF';
        this.creatingFlair = false;
      },
      error: (error) => {
        this.flairError = this.readErrorMessage(error, 'Could not add flair.');
        this.creatingFlair = false;
      }
    });
  }

  nextStage(): void {
    if (this.stage === 1) {
      this.createCommunityAndContinue();
      return;
    }

    if (this.stage < 4) {
      this.stage = (this.stage + 1) as 2 | 3 | 4;
    }
  }

  previousStage(): void {
    if (this.stage > 1) {
      this.stage = (this.stage - 1) as 1 | 2 | 3;
    }
  }

  finishSetup(): void {
    if (!this.createdCommunity) {
      this.error = 'Create the community first.';
      return;
    }

    this.router.navigate(['/app/community/c', this.createdCommunity.slug]);
  }

  previewBannerColor(): string {
    const nameSeed = String(this.form.get('name')?.value || '').trim();
    const seed = nameSeed || String(this.previewSeed);
    return this.pickBannerColor(seed);
  }

  private pickBannerColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const index = Math.abs(hash) % this.bannerPalette.length;
    return this.bannerPalette[index];
  }

  private cleanOptional(value: unknown): string | undefined {
    const str = String(value ?? '').trim();
    return str.length ? str : undefined;
  }

  private validateCommunityImageSize(bannerUrl?: string, iconUrl?: string): string | undefined {
    if (this.isTooLargeImagePayload(bannerUrl) || this.isTooLargeImagePayload(iconUrl)) {
      return 'Image payload is too large. Please upload a smaller image.';
    }

    return undefined;
  }

  private isTooLargeImagePayload(value?: string): boolean {
    return !!value && value.length > 1_500_000;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { error?: string } })?.error?.error;
    return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
  }
}
