import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Community, Flair } from '../../models/community.model';
import { Comment } from '../../models/comment.model';
import { Post } from '../../models/post.model';
import { CommunityService } from '../../services/community.service';
import { CommentService } from '../../services/comment.service';
import { GifPickerDialogComponent } from '../gif-picker-dialog/gif-picker-dialog.component';
import { PostService, ThreadSummary } from '../../services/post.service';
import { AuthService } from '../../../../auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { MentionCandidate, MentionContext, MentionHelperService } from '../../services/mention-helper.service';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css'
})
export class PostDetailComponent implements OnInit {
  community?: Community;
  flairs: Flair[] = [];
  post?: Post;
  comments: Comment[] = [];
  loading = true;
  error = '';
  commentError = '';
  postActionError = '';
  showCommentComposer = false;
  newCommentForm!: FormGroup;
  commentImageInputId = 'new-comment-image-input';
  submittingComment = false;
  commentMentionSuggestions: MentionCandidate[] = [];
  commentMentionPickerOpen = false;
  commentMentionActiveIndex = 0;
  private commentMentionContext: MentionContext | null = null;
  selectedImageUrl: string | null = null;
  editingPost = false;
  editPostForm!: FormGroup;
  savingPost = false;
  deletingPost = false;
  pinningPost = false;
  editPostImageInputId = 'edit-post-image-input';
  threadSummary?: ThreadSummary;
  parsedThreadSummary?: ParsedThreadSummary;
  loadingThreadSummary = false;
  summaryError = '';
  summaryPanelOpen = false;
  private readonly summaryIconWhitelist = new Set([
    'auto_awesome',
    'insights',
    'light_mode',
    'pets',
    'psychology',
    'track_changes',
    'visibility',
    'forum',
    'check_circle',
    'bolt',
    'schedule',
    'thumb_up',
    'priority_high',
    'emoji_objects',
    'school',
    'help',
    'question_answer',
    'campaign',
    'local_shipping',
    'flag',
    'error',
    'warning',
    'description',
    'gavel',
    'group',
    'task_alt',
    'label',
    'person'
  ]);
  private readonly summaryIconAlias: Record<string, string> = {
    warning_triangle: 'warning',
    urgent: 'priority_high',
    danger: 'error',
    question: 'help',
    discussion: 'forum',
    logistics: 'local_shipping',
    transport: 'local_shipping',
    medicine: 'pets',
    meds: 'pets',
    docs: 'description',
    document: 'description',
    legal: 'gavel',
    success: 'task_alt',
    solved: 'check_circle',
    teamwork: 'group',
    moderation: 'gavel',
    voice: 'campaign',
    help_center: 'help',
    warning_amber: 'warning',
    error_outline: 'error',
    local_offer: 'label',
    groups: 'group'
  };
  private readonly summaryPointFallbackIcons = ['insights', 'track_changes', 'visibility', 'forum', 'check_circle'];
  private readonly summaryConsiderationFallbackIcons = ['priority_high', 'schedule', 'help', 'warning', 'gavel'];

  get userId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  get isLoggedIn(): boolean {
    return !!this.userId;
  }

  get totalCommentCount(): number {
    return this.countComments(this.comments);
  }

  get hasAcceptedAnswer(): boolean {
    return this.comments.some((comment) => this.commentHasAcceptedAnswer(comment));
  }

  get postAuthorLabel(): string {
    if (!this.post) return 'Unknown author';
    const name = this.post.authorName?.trim();
    return name && name.length > 0 ? name : 'Member';
  }

  get canModerateCommunity(): boolean {
    const role = this.community?.userRole;
    return role === 'CREATOR' || role === 'MODERATOR';
  }

  get canEditPost(): boolean {
    return !!this.post && this.post.userId === this.userId;
  }

  get canDeletePost(): boolean {
    return !!this.post && (this.post.userId === this.userId || this.canModerateCommunity);
  }

  get canPinPost(): boolean {
    return !!this.post && this.canModerateCommunity;
  }

  get selectedEditFlair(): Flair | undefined {
    const flairId = this.editPostForm?.get('flairId')?.value;
    return this.flairs.find((flair) => flair.id === flairId);
  }

  // Edit post form getters
  get editPostTitle(): string {
    return this.editPostForm?.get('title')?.value || '';
  }

  get editPostContent(): string {
    return this.editPostForm?.get('content')?.value || '';
  }

  get editPostType(): 'DISCUSSION' | 'QUESTION' {
    return this.editPostForm?.get('type')?.value || 'DISCUSSION';
  }

  get editPostFlairId(): number | null {
    return this.editPostForm?.get('flairId')?.value ?? null;
  }

  get editPostImageUrl(): string {
    return this.editPostForm?.get('imageUrl')?.value || '';
  }

  get editPostTitleLength(): number {
    return this.editPostTitle.length;
  }

  get editPostContentLength(): number {
    return this.editPostContent.length;
  }

  get titleInvalid(): boolean {
    const control = this.editPostForm?.get('title');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get titleErrors(): string[] {
    const control = this.editPostForm?.get('title');
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.errors['required']) errors.push('Title is required.');
    if (control.errors['minlength']) errors.push('Title must be at least 6 characters.');
    if (control.errors['maxlength']) errors.push('Title must be less than 300 characters.');
    return errors;
  }

  get contentInvalid(): boolean {
    const control = this.editPostForm?.get('content');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get contentErrors(): string[] {
    const control = this.editPostForm?.get('content');
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.errors['required']) errors.push('Content is required.');
    if (control.errors['minlength']) errors.push('Content must be at least 20 characters.');
    if (control.errors['maxlength']) errors.push('Content must be less than 5000 characters.');
    return errors;
  }

  // New comment form getters
  get newCommentContent(): string {
    return this.newCommentForm?.get('content')?.value || '';
  }

  get newCommentImageUrl(): string {
    return this.newCommentForm?.get('imageUrl')?.value || '';
  }

  get newCommentContentLength(): number {
    return this.newCommentContent.length;
  }

  get newCommentContentInvalid(): boolean {
    const control = this.newCommentForm?.get('content');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get newCommentContentErrors(): string[] {
    const control = this.newCommentForm?.get('content');
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.errors['required']) errors.push('Comment content is required.');
    if (control.errors['minlength']) errors.push('Comment must be at least 1 character.');
    if (control.errors['maxlength']) errors.push('Comment must be less than 2000 characters.');
    return errors;
  }

  get latestActivityAt(): string | undefined {
    const latestComment = this.getLatestCommentDate(this.comments);
    if (!latestComment) {
      return this.post?.updatedAt || this.post?.createdAt;
    }

    const postUpdated = this.post?.updatedAt;
    if (!postUpdated) {
      return latestComment;
    }

    return new Date(latestComment).getTime() > new Date(postUpdated).getTime()
      ? latestComment
      : postUpdated;
  }

  get summaryPrimaryIcon(): string {
    return 'auto_awesome';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private commentService: CommentService,
    private communityService: CommunityService,
    private dialog: MatDialog,
    private auth: AuthService,
    private confirmDialog: ConfirmDialogService,
    private mentionHelper: MentionHelperService,
    private fb: FormBuilder
  ) {}

  private initializeEditPostForm(): void {
    this.editPostForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(300)]],
      content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
      type: ['DISCUSSION' as 'DISCUSSION' | 'QUESTION'],
      flairId: [null as number | null],
      imageUrl: ['', [Validators.maxLength(2000)]]
    });
  }

  private initializeNewCommentForm(): void {
    this.newCommentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      imageUrl: ['', [Validators.maxLength(2000)]]
    });
  }

  ngOnInit(): void {
    this.mentionHelper.loadCandidates().subscribe();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Post not found.';
      this.loading = false;
      return;
    }

    this.postService.getPost(id, this.userId).subscribe({
      next: (post) => {
        this.post = post;
        this.loadCommunityContext(post.communitySlug);
        this.loadComments(id);
      },
      error: (error) => {
        this.error = this.readErrorMessage(error, 'Unable to load post.');
        this.loading = false;
      }
    });
  }

  onPostVote(value: 1 | -1): void {
    if (!this.post) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const previousVote = this.post.userVote ?? null;
    const previousScore = this.post.voteScore;

    if (previousVote === value) {
      this.post.userVote = null;
      this.post.voteScore -= value;
      this.postService.removeVote(this.post.id, 'POST', this.userId).subscribe({
        error: () => this.restorePostVote(previousVote, previousScore)
      });
      return;
    }

    this.post.userVote = value;
    this.post.voteScore += value - (previousVote ?? 0);
    this.postService.vote(this.post.id, 'POST', value, this.userId).subscribe({
      error: () => this.restorePostVote(previousVote, previousScore)
    });
  }

  onAcceptAnswer(commentId: number): void {
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const previousAcceptedIds = this.collectAcceptedIds(this.comments);
    this.setAcceptedComment(this.comments, commentId);

    this.commentService.accept(commentId, this.userId).subscribe({
      error: (error) => {
        this.restoreAcceptedComments(this.comments, previousAcceptedIds);
        this.commentError = this.readErrorMessage(error, 'Unable to mark the accepted answer.');
      }
    });
  }

  beginPostEdit(): void {
    if (!this.post || !this.canEditPost) {
      return;
    }

    this.editingPost = true;
    this.postActionError = '';

    // Initialize form if not already done
    if (!this.editPostForm) {
      this.initializeEditPostForm();
    }

    // Patch form values
    this.editPostForm.patchValue({
      title: this.post.title,
      content: this.post.content,
      type: this.post.type,
      flairId: this.post.flairId ?? null,
      imageUrl: this.post.imageUrl || ''
    });

    // Reset form state
    this.editPostForm.markAsPristine();
    this.editPostForm.markAsUntouched();
  }

  cancelPostEdit(): void {
    if (this.savingPost) {
      return;
    }

    this.editingPost = false;
    this.postActionError = '';
  }

  savePostEdits(): void {
    if (!this.post || !this.canEditPost || !this.userId) {
      return;
    }

    if (this.editPostForm.invalid) {
      this.editPostForm.markAllAsTouched();
      this.postActionError = 'Please fix the validation errors before saving.';
      return;
    }

    this.savingPost = true;
    this.postActionError = '';

    const formValue = this.editPostForm.value;

    this.postService.update(this.post.id, {
      title: formValue.title.trim(),
      content: formValue.content.trim(),
      type: formValue.type,
      flairId: formValue.flairId ?? undefined,
      imageUrl: this.cleanOptional(formValue.imageUrl)
    }, this.userId).subscribe({
      next: (updatedPost) => {
        this.post = updatedPost;
        this.editingPost = false;
        this.savingPost = false;
      },
      error: (error) => {
        this.postActionError = this.readErrorMessage(error, 'Unable to save post changes.');
        this.savingPost = false;
      }
    });
  }

  deletePost(): void {
    if (!this.post || !this.canDeletePost || !this.userId) {
      return;
    }

    if (!this.confirmDialog.confirmDelete('post')) {
      return;
    }

    this.deletingPost = true;
    this.postActionError = '';
    this.postService.delete(this.post.id, this.userId).subscribe({
      next: () => this.router.navigate(['/app/community/c', this.post?.communitySlug]),
      error: (error) => {
        this.postActionError = this.readErrorMessage(error, 'Unable to delete post.');
        this.deletingPost = false;
      }
    });
  }

  togglePinPost(): void {
    if (!this.post || !this.canPinPost || !this.userId) {
      return;
    }

    this.pinningPost = true;
    this.postActionError = '';
    const request = this.post.pinned
      ? this.postService.unpin(this.post.id, this.userId)
      : this.postService.pin(this.post.id, this.userId);

    request.subscribe({
      next: (updatedPost) => {
        this.post = updatedPost;
        this.pinningPost = false;
      },
      error: (error) => {
        this.postActionError = this.readErrorMessage(error, 'Unable to update pin state.');
        this.pinningPost = false;
      }
    });
  }

  onPostImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editPostForm.patchValue({ imageUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearPostImage(): void {
    this.editPostForm.patchValue({ imageUrl: '' });
  }

  submitComment(): void {
    if (!this.post || !this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.newCommentForm.invalid) {
      this.newCommentForm.markAllAsTouched();
      this.commentError = 'Please fix the validation errors before posting.';
      return;
    }

    this.submittingComment = true;
    this.commentError = '';

    const formValue = this.newCommentForm.value;
    const payload: Partial<Comment> = {
      content: formValue.content.trim(),
      postId: this.post.id,
      imageUrl: this.cleanOptional(formValue.imageUrl)
    };
    this.commentService.create(this.post.id, payload, this.userId).subscribe({
      next: (comment) => {
        comment.replies = comment.replies ?? [];
        this.comments = [...this.comments, comment];
        this.newCommentForm.reset();
        this.showCommentComposer = false;
        this.submittingComment = false;
      },
      error: (error) => {
        this.commentError = this.readErrorMessage(error, 'Could not post comment.');
        this.submittingComment = false;
      }
    });
  }

  onCommentImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.newCommentForm.patchValue({ imageUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearCommentImage(): void {
    this.newCommentForm.patchValue({ imageUrl: '' });
  }

  openGifPicker(): void {
    const dialogRef = this.dialog.open(GifPickerDialogComponent, {
      width: '920px',
      maxWidth: '95vw',
      panelClass: 'gif-picker-dialog-panel',
      data: { title: 'Choose a GIF' }
    });

    dialogRef.afterClosed().subscribe((gif) => {
      if (!gif) {
        return;
      }

      this.newCommentForm.patchValue({ imageUrl: gif.gifUrl });
    });
  }

  openImageModal(imageUrl?: string | null): void {
    if (!imageUrl) {
      return;
    }
    this.selectedImageUrl = imageUrl;
  }

  closeImageModal(): void {
    this.selectedImageUrl = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeImageModal();
  }

  openCommentComposer(): void {
    this.showCommentComposer = true;

    // Initialize form if not already done
    if (!this.newCommentForm) {
      this.initializeNewCommentForm();
    }

    // Reset form
    this.newCommentForm.reset();
    this.newCommentForm.markAsPristine();
    this.newCommentForm.markAsUntouched();
  }

  closeCommentComposer(): void {
    if (this.submittingComment) {
      return;
    }
    this.showCommentComposer = false;
    this.newCommentForm.reset();
    this.commentError = '';
    this.closeCommentMentionPicker();
  }

  onCommentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target?.value || '';
    const caret = target?.selectionStart ?? value.length;
    this.updateCommentMentionPicker(value, caret);
  }

  onCommentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLTextAreaElement;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const deletion = this.mentionHelper.applyAtomicMentionDelete(
        this.newCommentContent,
        target?.selectionStart ?? this.newCommentContent.length,
        event.key
      );

      if (deletion.handled) {
        event.preventDefault();
        this.newCommentForm.patchValue({ content: deletion.value });
        this.updateCommentMentionPicker(deletion.value, deletion.caret);

        window.setTimeout(() => {
          target?.setSelectionRange(deletion.caret, deletion.caret);
        }, 0);
        return;
      }
    }

    if (!this.commentMentionPickerOpen || this.commentMentionSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.commentMentionActiveIndex = (this.commentMentionActiveIndex + 1) % this.commentMentionSuggestions.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.commentMentionActiveIndex = (this.commentMentionActiveIndex - 1 + this.commentMentionSuggestions.length)
        % this.commentMentionSuggestions.length;
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.selectCommentMention(this.commentMentionSuggestions[this.commentMentionActiveIndex]);
      return;
    }

    if (event.key === 'Escape') {
      this.closeCommentMentionPicker();
    }
  }

  selectCommentMention(candidate: MentionCandidate): void {
    if (!candidate || !this.commentMentionContext) {
      return;
    }

    const applied = this.mentionHelper.applyMention(this.newCommentContent, this.commentMentionContext, candidate);
    this.newCommentForm.patchValue({ content: applied.value });
    this.closeCommentMentionPicker();
  }

  onCommentMentionBlur(): void {
    window.setTimeout(() => this.closeCommentMentionPicker(), 120);
  }

  syncCommentOverlay(event: Event, overlay: HTMLElement): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea || !overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  scrollToComments(): void {
    const commentsSection = document.getElementById('comments');
    if (!commentsSection) {
      return;
    }

    commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private loadComments(postId: number): void {
    this.commentService.getTree(postId, this.userId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.loading = false;
        this.scrollToCommentFragment();
      },
      error: (error) => {
        this.error = this.readErrorMessage(error, 'Unable to load comments.');
        this.loading = false;
      }
    });
  }

  private scrollToCommentFragment(): void {
    const fragment = (this.route.snapshot.fragment || '').trim();
    if (!fragment) {
      return;
    }

    window.setTimeout(() => {
      document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  private loadCommunityContext(slug: string): void {
    if (!slug) {
      return;
    }

    this.communityService.getBySlug(slug, this.userId).subscribe({
      next: (community) => {
        this.community = community;
        this.communityService.getFlairs(community.id).subscribe({
          next: (flairs) => (this.flairs = flairs),
          error: () => (this.flairs = [])
        });
      },
      error: () => {
        this.community = undefined;
        this.flairs = [];
      }
    });
  }

  onThreadSummaryAction(): void {
    this.summaryPanelOpen = true;
    this.loadThreadSummary(true);
  }

  private loadThreadSummary(force = false): void {
    if (!this.post) {
      return;
    }

    if (this.loadingThreadSummary) {
      return;
    }

    if (!force && this.threadSummary?.postId === this.post.id) {
      return;
    }

    this.loadingThreadSummary = true;
    this.summaryError = '';

    this.postService.summarizeThread(this.post.id, this.userId).subscribe({
      next: (summary) => {
        this.threadSummary = summary;
        this.parsedThreadSummary = this.parseThreadSummary(summary.summary);
        this.loadingThreadSummary = false;
      },
      error: (error) => {
        this.threadSummary = undefined;
        this.parsedThreadSummary = undefined;
        this.summaryError = this.readErrorMessage(error, 'AI summary is unavailable right now.');
        this.loadingThreadSummary = false;
      }
    });
  }

  private parseThreadSummary(rawSummary: string): ParsedThreadSummary {
    const normalized = (rawSummary || '').trim();
    if (!normalized) {
      return {
        tldr: {
          text: 'No summary available yet.',
          icon: 'auto_awesome'
        },
        keyPoints: [],
        considerations: []
      };
    }

    const parsedJson = this.parseSummaryJson(normalized);
    if (parsedJson) {
      return parsedJson;
    }

    const parsedJsonLike = this.parseSummaryJsonLike(normalized);
    if (parsedJsonLike) {
      return parsedJsonLike;
    }

    return this.parseSummaryText(normalized);
  }

  private parseSummaryJson(rawSummary: string): ParsedThreadSummary | null {
    const jsonCandidate = this.extractJsonCandidate(rawSummary);
    if (!jsonCandidate) {
      return null;
    }

    try {
      const value = JSON.parse(jsonCandidate) as {
        tldr?: unknown;
        tlDr?: unknown;
        summary?: unknown;
        keyPoints?: unknown;
        key_points?: unknown;
        considerations?: unknown;
        openQuestions?: unknown;
        constraints?: unknown;
      };

      const tldr = this.parseSummaryItem(value.tldr ?? value.tlDr ?? value.summary, 'auto_awesome');
      const keyPointsSource = value.keyPoints ?? value.key_points;
      const considerationsSource = value.considerations ?? value.openQuestions ?? value.constraints;

      const keyPoints = this.parseSummaryPoints(keyPointsSource, this.summaryPointFallbackIcons);
      const considerations = this.parseSummaryPoints(considerationsSource, this.summaryConsiderationFallbackIcons);

      if (!tldr && !keyPoints.length && !considerations.length) {
        return null;
      }

      return {
        tldr: tldr || {
          text: 'Summary available below.',
          icon: this.summaryPrimaryIcon
        },
        keyPoints,
        considerations
      };
    } catch {
      return null;
    }
  }

  private extractJsonCandidate(rawSummary: string): string {
    const withoutFences = rawSummary
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (withoutFences.startsWith('{') && withoutFences.endsWith('}')) {
      return withoutFences;
    }

    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return withoutFences.slice(start, end + 1).trim();
    }

    return '';
  }

  private parseSummaryText(rawSummary: string): ParsedThreadSummary {
    const lines = rawSummary
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => !!line);

    let tldr = '';
    const keyPoints: string[] = [];
    const considerations: string[] = [];
    let section: 'NONE' | 'KEY_POINTS' | 'CONSIDERATIONS' = 'NONE';

    for (const line of lines) {
      if (/^[\{\}\[\],]+$/.test(line)) {
        continue;
      }

      if (/^"[a-zA-Z0-9_]+"\s*:/.test(line)) {
        continue;
      }

      const lower = line.toLowerCase();

      if (lower.startsWith('tl;dr') || lower.startsWith('tldr')) {
        tldr = this.cleanSummaryLabel(line, /^(tl;dr|tldr)\s*[:\-]?\s*/i);
        section = 'NONE';
        continue;
      }

      if (lower.startsWith('key points')) {
        section = 'KEY_POINTS';
        const possibleInline = this.cleanSummaryLabel(line, /^key points\s*[:\-]?\s*/i);
        if (possibleInline) {
          keyPoints.push(possibleInline);
        }
        continue;
      }

      if (lower.startsWith('considerations') || lower.startsWith('constraints') || lower.startsWith('open questions')) {
        section = 'CONSIDERATIONS';
        const possibleInline = this.cleanSummaryLabel(line, /^(considerations|constraints|open questions)\s*[:\-]?\s*/i);
        if (possibleInline) {
          considerations.push(possibleInline);
        }
        continue;
      }

      const numbered = line.match(/^(\d+)[\)\].:\-]?\s+(.+)$/);
      const bulleted = line.match(/^[-*•]\s+(.+)$/);

      if (numbered?.[2]) {
        if (section === 'CONSIDERATIONS') {
          considerations.push(numbered[2].trim());
        } else {
          keyPoints.push(numbered[2].trim());
          section = 'KEY_POINTS';
        }
        continue;
      }

      if (bulleted?.[1]) {
        if (section === 'CONSIDERATIONS') {
          considerations.push(bulleted[1].trim());
        } else {
          keyPoints.push(bulleted[1].trim());
          section = 'KEY_POINTS';
        }
        continue;
      }

      if (section === 'CONSIDERATIONS') {
        considerations.push(line);
        continue;
      }

      if (section === 'KEY_POINTS') {
        keyPoints.push(line);
        continue;
      }

      if (!tldr) {
        tldr = line;
      } else {
        keyPoints.push(line);
      }
    }

    return {
      tldr: {
        text: tldr || 'Summary available below.',
        icon: this.summaryPrimaryIcon
      },
      keyPoints: keyPoints.map((point, index) => this.toSummaryPoint(point, index, this.summaryPointFallbackIcons)),
      considerations: considerations.map((point, index) => this.toSummaryPoint(point, index, this.summaryConsiderationFallbackIcons))
    };
  }

  private parseSummaryJsonLike(rawSummary: string): ParsedThreadSummary | null {
    const source = rawSummary
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const tldr = this.extractJsonStringField(source, 'tldr')
      || this.extractJsonStringField(source, 'summary');
    const keyPoints = this.extractJsonArrayField(source, 'keyPoints')
      || this.extractJsonArrayField(source, 'key_points');
    const considerations = this.extractJsonArrayField(source, 'considerations')
      || this.extractJsonArrayField(source, 'constraints')
      || this.extractJsonArrayField(source, 'openQuestions');

    if (!tldr && !keyPoints.length && !considerations.length) {
      return null;
    }

    return {
      tldr: {
        text: tldr || 'Summary available below.',
        icon: this.summaryPrimaryIcon
      },
      keyPoints: keyPoints.map((point, index) => this.toSummaryPoint(point, index, this.summaryPointFallbackIcons)),
      considerations: considerations.map((point, index) => this.toSummaryPoint(point, index, this.summaryConsiderationFallbackIcons))
    };
  }

  private parseSummaryItem(value: unknown, fallbackIcon: string): SummaryLine | null {
    if (typeof value === 'string') {
      const text = this.cleanSummaryText(value);
      if (!text) {
        return null;
      }

      return {
        text,
        icon: this.normalizeMaterialIcon('', this.inferSummaryIcon(text, fallbackIcon))
      };
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const text = this.cleanSummaryText((value as { text?: unknown }).text);
    const icon = this.normalizeMaterialIcon(
      (value as { icon?: unknown }).icon,
      this.inferSummaryIcon(text, fallbackIcon)
    );
    if (!text) {
      return null;
    }

    return {
      text,
      icon
    };
  }

  private parseSummaryPoints(value: unknown, fallbackIcons: string[]): SummaryLine[] {
    if (!Array.isArray(value)) {
      const asText = this.cleanSummaryText(value);
      return this.splitPossibleList(asText).map((item, index) => this.toSummaryPoint(item, index, fallbackIcons));
    }

    const points: SummaryLine[] = [];
    value.forEach((entry, index) => {
      const parsed = this.parseSummaryItem(entry, fallbackIcons[index % fallbackIcons.length]);
      if (parsed) {
        points.push(parsed);
      }
    });

    return points;
  }

  private toSummaryPoint(text: string, index: number, fallbackIcons: string[]): SummaryLine {
    const fallbackIcon = fallbackIcons[index % fallbackIcons.length];
    return {
      text,
      icon: this.inferSummaryIcon(text, fallbackIcon)
    };
  }

  private normalizeMaterialIcon(value: unknown, fallback: string): string {
    const normalized = this.cleanSummaryText(value).toLowerCase().replace(/\s+/g, '_');
    const aliased = this.summaryIconAlias[normalized] || normalized;
    if (this.summaryIconWhitelist.has(aliased)) {
      return aliased;
    }

    if (this.summaryIconWhitelist.has(normalized)) {
      return normalized;
    }

    const fallbackAliased = this.summaryIconAlias[fallback] || fallback;
    if (this.summaryIconWhitelist.has(fallbackAliased)) {
      return fallbackAliased;
    }

    return 'auto_awesome';
  }

  private inferSummaryIcon(text: string, fallback: string): string {
    const lower = (text || '').toLowerCase();

    if (!lower) {
      return fallback;
    }

    if (/urgent|asap|immediate|critical|blocked/.test(lower)) return 'priority_high';
    if (/risk|unsafe|danger|failure|issue|cancel/.test(lower)) return 'warning';
    if (/when|timeline|deadline|today|tonight|hour|min|schedule/.test(lower)) return 'schedule';
    if (/question|unknown|clarify|unclear|ask|why/.test(lower)) return 'help';
    if (/discussion|debate|thread|conversation|reply|comment/.test(lower)) return 'forum';
    if (/driver|transport|pickup|drop|route|handoff|crate/.test(lower)) return 'local_shipping';
    if (/med|medicine|medication|vet|health/.test(lower)) return 'pets';
    if (/form|document|paper|signed|approval/.test(lower)) return 'description';
    if (/resolved|accepted|done|confirmed|ready/.test(lower)) return 'task_alt';
    if (/team|volunteer|rescue|staff|community/.test(lower)) return 'group';
    if (/pet|dog|cat|animal|foster/.test(lower)) return 'pets';

    return fallback;
  }

  private extractJsonStringField(source: string, key: string): string {
    const pattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, 'i');
    const match = source.match(pattern);
    if (!match?.[1]) {
      return '';
    }

    return this.cleanSummaryText(this.decodeLooseJsonString(match[1]));
  }

  private extractJsonArrayField(source: string, key: string): string[] {
    const pattern = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
    const match = source.match(pattern);
    if (!match?.[1]) {
      return [];
    }

    const values: string[] = [];
    const itemPattern = /"((?:\\.|[^"\\])*)"/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemPattern.exec(match[1])) !== null) {
      const cleaned = this.cleanSummaryText(this.decodeLooseJsonString(itemMatch[1]));
      if (cleaned) {
        values.push(cleaned);
      }
    }

    return values;
  }

  private decodeLooseJsonString(value: string): string {
    return value
      .replace(/\\n/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  private cleanSummaryLabel(value: string, pattern: RegExp): string {
    return value.replace(pattern, '').trim();
  }

  private cleanSummaryText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/\s+/g, ' ')
      .trim();
  }

  private splitPossibleList(value: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(/\s*[;\n]\s*/)
      .map((item) => item.trim())
      .filter((item) => !!item);
  }

  private restorePostVote(previousVote: 1 | -1 | null, previousScore: number): void {
    if (!this.post) return;
    this.post.userVote = previousVote;
    this.post.voteScore = previousScore;
  }

  private countComments(comments: Comment[]): number {
    return comments.reduce((count, comment) => count + 1 + this.countComments(comment.replies ?? []), 0);
  }

  private getLatestCommentDate(comments: Comment[]): string | undefined {
    let latest: string | undefined;

    const visit = (items: Comment[]): void => {
      items.forEach((comment) => {
        if (!latest || new Date(comment.createdAt).getTime() > new Date(latest).getTime()) {
          latest = comment.createdAt;
        }
        if (comment.replies?.length) {
          visit(comment.replies);
        }
      });
    };

    visit(comments);
    return latest;
  }

  private commentHasAcceptedAnswer(comment: Comment): boolean {
    if (comment.acceptedAnswer) {
      return true;
    }

    return (comment.replies ?? []).some((reply) => this.commentHasAcceptedAnswer(reply));
  }

  private collectAcceptedIds(comments: Comment[], ids: number[] = []): number[] {
    comments.forEach((comment) => {
      if (comment.acceptedAnswer) {
        ids.push(comment.id);
      }
      this.collectAcceptedIds(comment.replies ?? [], ids);
    });

    return ids;
  }

  private setAcceptedComment(comments: Comment[], commentId: number): void {
    comments.forEach((comment) => {
      comment.acceptedAnswer = comment.id === commentId;
      this.setAcceptedComment(comment.replies ?? [], commentId);
    });
  }

  private restoreAcceptedComments(comments: Comment[], acceptedIds: number[]): void {
    const acceptedSet = new Set(acceptedIds);
    comments.forEach((comment) => {
      comment.acceptedAnswer = acceptedSet.has(comment.id);
      this.restoreAcceptedComments(comment.replies ?? [], acceptedIds);
    });
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { error?: string } })?.error?.error;
    return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
  }

  private cleanOptional(value: unknown): string | undefined {
    const str = String(value ?? '').trim();
    return str.length ? str : undefined;
  }

  private updateCommentMentionPicker(value: string, caret: number): void {
    const context = this.mentionHelper.resolveContext(value, caret);
    if (!context) {
      this.closeCommentMentionPicker();
      return;
    }

    const suggestions = this.mentionHelper.filterCandidates(context.query);
    this.commentMentionContext = context;
    this.commentMentionSuggestions = suggestions;
    this.commentMentionPickerOpen = suggestions.length > 0;
    this.commentMentionActiveIndex = 0;
  }

  private closeCommentMentionPicker(): void {
    this.commentMentionPickerOpen = false;
    this.commentMentionSuggestions = [];
    this.commentMentionActiveIndex = 0;
    this.commentMentionContext = null;
  }
}

interface ParsedThreadSummary {
  tldr: SummaryLine;
  keyPoints: SummaryLine[];
  considerations: SummaryLine[];
}

interface SummaryLine {
  text: string;
  icon: string;
}
