import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Flair } from '../../models/community.model';
import { CommunityService } from '../../services/community.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../../../auth/auth.service';
import { MentionCandidate, MentionContext, MentionHelperService } from '../../services/mention-helper.service';

@Component({
  selector: 'app-post-create',
  templateUrl: './post-create.component.html',
  styleUrl: './post-create.component.css'
})
export class PostCreateComponent implements OnInit {
  communityId = 0;
  communitySlug = '';
  communityName = 'Community';
  communityType: 'PUBLIC' | 'PRIVATE' = 'PUBLIC';
  loadingCommunity = true;
  flairs: Flair[] = [];
  saving = false;
  error = '';
  postImagePreview = '';
  imageInputId = 'post-image-input';
  mentionSuggestions: MentionCandidate[] = [];
  mentionPickerOpen = false;
  mentionActiveIndex = 0;
  private mentionContext: MentionContext | null = null;

  get userId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  get titleLength(): number {
    return String(this.form.get('title')?.value || '').length;
  }

  get contentLength(): number {
    return String(this.form.get('content')?.value || '').length;
  }

  get selectedFlair(): Flair | undefined {
    const flairId = this.form.get('flairId')?.value;
    return this.flairs.find((flair) => flair.id === flairId);
  }

  form;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private communityService: CommunityService,
    private auth: AuthService,
    private mentionHelper: MentionHelperService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(6)]],
      content: ['', [Validators.required, Validators.minLength(20)]],
      type: ['DISCUSSION'],
      flairId: [null as number | null],
      imageUrl: ['']
    });
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      this.form.patchValue({ imageUrl: value });
      this.postImagePreview = value;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearPostImage(): void {
    this.form.patchValue({ imageUrl: '' });
    this.postImagePreview = '';
  }

  ngOnInit(): void {
    this.mentionHelper.loadCandidates().subscribe();

    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const communityId = Number(this.route.snapshot.queryParamMap.get('communityId'));
    const slug = String(this.route.snapshot.paramMap.get('slug') || '').trim();

    this.communitySlug = slug;
    this.communityId = Number.isFinite(communityId) ? communityId : 0;

    if (slug) {
      this.communityService.getBySlug(slug, this.userId).subscribe({
        next: (community) => {
          this.communityId = this.communityId || community.id;
          this.communityName = community.name;
          this.communityType = community.type;
          this.loadingCommunity = false;
          this.loadFlairs(this.communityId);
        },
        error: (error) => {
          this.error = this.readErrorMessage(error, 'Unable to load the community context.');
          this.loadingCommunity = false;
        }
      });
      return;
    }

    if (this.communityId) {
      this.loadingCommunity = false;
      this.loadFlairs(this.communityId);
      return;
    }

    this.loadingCommunity = false;
    this.error = 'Community context is missing for this post.';
  }

  submit(): void {
    if (this.form.invalid || !this.communityId) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.saving = true;
    this.error = '';
    const payload: { title: string; content: string; type: 'DISCUSSION' | 'QUESTION'; flairId?: number; imageUrl?: string } = {
      title: this.form.value.title ?? '',
      content: this.form.value.content ?? '',
      type: (this.form.value.type as 'DISCUSSION' | 'QUESTION') ?? 'DISCUSSION',
      flairId: this.form.value.flairId ?? undefined,
      imageUrl: this.cleanOptional(this.form.value.imageUrl)
    };

    this.postService.create(this.communityId, payload, userId).subscribe({
      next: (post) => this.router.navigate(['/app/community/post', post.id]),
      error: (error) => {
        this.error = this.readErrorMessage(error, 'Could not create post.');
        this.saving = false;
      }
    });
  }

  onContentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target?.value || '';
    const caret = target?.selectionStart ?? value.length;
    this.updateMentionPicker(value, caret);
  }

  onContentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLTextAreaElement;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const currentValue = String(this.form.get('content')?.value || '');
      const deletion = this.mentionHelper.applyAtomicMentionDelete(
        currentValue,
        target?.selectionStart ?? currentValue.length,
        event.key
      );

      if (deletion.handled) {
        event.preventDefault();
        this.form.patchValue({ content: deletion.value });
        this.updateMentionPicker(deletion.value, deletion.caret);

        window.setTimeout(() => {
          target?.setSelectionRange(deletion.caret, deletion.caret);
        }, 0);
        return;
      }
    }

    if (!this.mentionPickerOpen || this.mentionSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.mentionActiveIndex = (this.mentionActiveIndex + 1) % this.mentionSuggestions.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.mentionActiveIndex = (this.mentionActiveIndex - 1 + this.mentionSuggestions.length) % this.mentionSuggestions.length;
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.selectMention(this.mentionSuggestions[this.mentionActiveIndex]);
      return;
    }

    if (event.key === 'Escape') {
      this.closeMentionPicker();
    }
  }

  selectMention(candidate: MentionCandidate): void {
    if (!candidate || !this.mentionContext) {
      return;
    }

    const currentValue = String(this.form.get('content')?.value || '');
    const applied = this.mentionHelper.applyMention(currentValue, this.mentionContext, candidate);
    this.form.patchValue({ content: applied.value });
    this.closeMentionPicker();
  }

  onMentionBlur(): void {
    window.setTimeout(() => this.closeMentionPicker(), 120);
  }

  syncContentOverlay(event: Event, overlay: HTMLElement): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea || !overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  private loadFlairs(communityId: number): void {
    if (!communityId) {
      return;
    }

    this.communityService.getFlairs(communityId).subscribe({
      next: (flairs) => (this.flairs = flairs),
      error: () => (this.flairs = [])
    });
  }

  private cleanOptional(value: unknown): string | undefined {
    const str = String(value ?? '').trim();
    return str.length ? str : undefined;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { error?: string } })?.error?.error;
    return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
  }

  private updateMentionPicker(value: string, caret: number): void {
    const context = this.mentionHelper.resolveContext(value, caret);
    if (!context) {
      this.closeMentionPicker();
      return;
    }

    const suggestions = this.mentionHelper.filterCandidates(context.query);
    this.mentionContext = context;
    this.mentionSuggestions = suggestions;
    this.mentionPickerOpen = suggestions.length > 0;
    this.mentionActiveIndex = 0;
  }

  private closeMentionPicker(): void {
    this.mentionPickerOpen = false;
    this.mentionSuggestions = [];
    this.mentionActiveIndex = 0;
    this.mentionContext = null;
  }
}
