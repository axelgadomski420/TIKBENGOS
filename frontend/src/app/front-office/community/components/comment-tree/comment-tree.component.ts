import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Comment } from '../../models/comment.model';
import { CommentService } from '../../services/comment.service';
import { GifPickerDialogComponent } from '../gif-picker-dialog/gif-picker-dialog.component';
import { VoteService } from '../../services/vote.service';
import { MentionCandidate, MentionContext, MentionHelperService } from '../../services/mention-helper.service';

@Component({
  selector: 'app-comment-tree',
  templateUrl: './comment-tree.component.html',
  styleUrl: './comment-tree.component.css'
})
export class CommentTreeComponent {
  @Input() comment!: Comment;
  @Input() postId!: number;
  @Input() postOwnerId!: number;
  @Input() postType!: 'DISCUSSION' | 'QUESTION';
  @Input() depth = 0;
  @Input() userId?: number;
  @Input() canModerateCommunity = false;
  @Input() acceptedAnswerSelected = false;
  @Output() accept = new EventEmitter<number>();
  @Output() imagePreview = new EventEmitter<string>();

  showReplyForm = false;
  editingComment = false;
  replyForm!: FormGroup;
  editCommentForm!: FormGroup;
  editError = '';
  replyImageInputId = `reply-image-input-${Math.random().toString(36).slice(2)}`;
  editImageInputId = `edit-image-input-${Math.random().toString(36).slice(2)}`;
  submittingReply = false;
  savingComment = false;
  deletingComment = false;
  replyError = '';
  replyMentionSuggestions: MentionCandidate[] = [];
  replyMentionPickerOpen = false;
  replyMentionActiveIndex = 0;
  private replyMentionContext: MentionContext | null = null;

  constructor(
    private voteService: VoteService,
    private commentService: CommentService,
    private dialog: MatDialog,
    private router: Router,
    private mentionHelper: MentionHelperService,
    private fb: FormBuilder
  ) {}

  private initializeReplyForm(): void {
    this.replyForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      imageUrl: ['', [Validators.maxLength(2000)]]
    });
  }

  private initializeEditCommentForm(): void {
    this.editCommentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(2000)]],
      imageUrl: ['', [Validators.maxLength(2000)]]
    });
  }

  get canAccept(): boolean {
    return this.postType === 'QUESTION'
      && this.userId === this.postOwnerId
      && !this.acceptedAnswerSelected
      && !this.comment.acceptedAnswer;
  }

  get hasReplies(): boolean {
    return (this.comment.replies ?? []).length > 0;
  }

  get canEditComment(): boolean {
    return !!this.userId && this.comment.userId === this.userId;
  }

  get canDeleteComment(): boolean {
    return !!this.userId && (this.comment.userId === this.userId || this.canModerateCommunity);
  }

  get isDeletedComment(): boolean {
    return this.comment.content === '[deleted]';
  }

  // Reply form getters
  get replyContent(): string {
    return this.replyForm?.get('content')?.value || '';
  }

  get replyImageUrl(): string {
    return this.replyForm?.get('imageUrl')?.value || '';
  }

  get replyContentLength(): number {
    return this.replyContent.length;
  }

  get replyContentInvalid(): boolean {
    const control = this.replyForm?.get('content');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get replyContentErrors(): string[] {
    const control = this.replyForm?.get('content');
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.errors['required']) errors.push('Reply content is required.');
    if (control.errors['minlength']) errors.push('Reply must be at least 1 character.');
    if (control.errors['maxlength']) errors.push('Reply must be less than 2000 characters.');
    return errors;
  }

  // Edit comment form getters
  get editContent(): string {
    return this.editCommentForm?.get('content')?.value || '';
  }

  get editImageUrl(): string {
    return this.editCommentForm?.get('imageUrl')?.value || '';
  }

  get editContentLength(): number {
    return this.editContent.length;
  }

  get contentInvalid(): boolean {
    const control = this.editCommentForm?.get('content');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get contentErrors(): string[] {
    const control = this.editCommentForm?.get('content');
    if (!control || !control.errors) return [];

    const errors: string[] = [];
    if (control.errors['required']) errors.push('Comment content is required.');
    if (control.errors['minlength']) errors.push('Comment must be at least 1 character.');
    if (control.errors['maxlength']) errors.push('Comment must be less than 2000 characters.');
    return errors;
  }

  onVote(value: 1 | -1): void {
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const previousVote = this.comment.userVote ?? null;
    const previousScore = this.comment.voteScore;

    if (previousVote === value) {
      this.comment.userVote = null;
      this.comment.voteScore -= value;
      this.voteService.remove(this.comment.id, 'COMMENT', this.userId).subscribe({
        error: () => this.restoreVote(previousVote, previousScore)
      });
      return;
    }

    this.comment.userVote = value;
    this.comment.voteScore += value - (previousVote ?? 0);
    this.voteService.vote(this.comment.id, 'COMMENT', value, this.userId).subscribe({
      error: () => this.restoreVote(previousVote, previousScore)
    });
  }

  acceptAnswer(): void {
    this.accept.emit(this.comment.id);
  }

  beginEditComment(): void {
    if (!this.canEditComment || this.isDeletedComment) {
      return;
    }

    this.editingComment = true;
    this.editError = '';

    // Initialize form if not already done
    if (!this.editCommentForm) {
      this.initializeEditCommentForm();
    }

    // Patch form values
    this.editCommentForm.patchValue({
      content: this.comment.content,
      imageUrl: this.comment.imageUrl || ''
    });

    // Reset form state
    this.editCommentForm.markAsPristine();
    this.editCommentForm.markAsUntouched();
  }

  cancelEditComment(): void {
    if (this.savingComment) {
      return;
    }

    this.editingComment = false;
    this.editError = '';
  }

  saveEditComment(): void {
    if (!this.canEditComment || !this.userId || this.isDeletedComment) {
      return;
    }

    if (this.editCommentForm.invalid) {
      this.editCommentForm.markAllAsTouched();
      this.editError = 'Please fix the validation errors before saving.';
      return;
    }

    this.savingComment = true;
    this.editError = '';

    const formValue = this.editCommentForm.value;

    this.commentService.update(this.comment.id, {
      content: formValue.content.trim(),
      imageUrl: this.cleanOptional(formValue.imageUrl)
    }, this.userId).subscribe({
      next: (updatedComment) => {
        this.comment.content = updatedComment.content;
        this.comment.imageUrl = updatedComment.imageUrl;
        this.comment.acceptedAnswer = updatedComment.acceptedAnswer;
        this.comment.voteScore = updatedComment.voteScore;
        this.comment.userVote = updatedComment.userVote;
        this.editingComment = false;
        this.savingComment = false;
      },
      error: (error) => {
        this.editError = this.readErrorMessage(error, 'Could not save comment changes.');
        this.savingComment = false;
      }
    });
  }

  deleteComment(): void {
    if (!this.canDeleteComment || !this.userId || this.isDeletedComment) {
      return;
    }

    if (!window.confirm('Delete this comment? This action cannot be undone.')) {
      return;
    }

    this.deletingComment = true;
    this.editError = '';
    this.commentService.delete(this.comment.id, this.userId).subscribe({
      next: () => {
        this.comment.content = '[deleted]';
        this.comment.imageUrl = undefined;
        this.comment.acceptedAnswer = false;
        this.editingComment = false;
        this.showReplyForm = false;
        this.deletingComment = false;
      },
      error: (error) => {
        this.editError = this.readErrorMessage(error, 'Could not delete comment.');
        this.deletingComment = false;
      }
    });
  }

  toggleReplyForm(): void {
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.showReplyForm = !this.showReplyForm;
    if (!this.showReplyForm) {
      this.replyError = '';
      this.closeReplyMentionPicker();
      return;
    }

    // Initialize form if not already done
    if (!this.replyForm) {
      this.initializeReplyForm();
    }

    // Reset form
    this.replyForm.reset();
    this.replyForm.markAsPristine();
    this.replyForm.markAsUntouched();

    this.mentionHelper.loadCandidates().subscribe();
  }

  submitReply(): void {
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.replyForm.invalid) {
      this.replyForm.markAllAsTouched();
      this.replyError = 'Please fix the validation errors before posting.';
      return;
    }

    this.submittingReply = true;
    this.replyError = '';

    const formValue = this.replyForm.value;
    const payload: Partial<Comment> = {
      content: formValue.content.trim(),
      postId: this.postId,
      parentCommentId: this.comment.id,
      imageUrl: this.cleanOptional(formValue.imageUrl)
    };
    this.commentService.create(this.postId, payload, this.userId).subscribe({
      next: (reply) => {
        reply.replies = reply.replies ?? [];
        this.comment.replies = [...(this.comment.replies ?? []), reply];
        this.replyForm.reset();
        this.showReplyForm = false;
        this.closeReplyMentionPicker();
        this.submittingReply = false;
      },
      error: (error) => {
        this.replyError = this.readErrorMessage(error, 'Could not post reply.');
        this.submittingReply = false;
      }
    });
  }

  onReplyImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.replyForm.patchValue({ imageUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearReplyImage(): void {
    this.replyForm.patchValue({ imageUrl: '' });
  }

  onReplyInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const value = target?.value || '';
    const caret = target?.selectionStart ?? value.length;
    this.updateReplyMentionPicker(value, caret);
  }

  onReplyKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLTextAreaElement;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const deletion = this.mentionHelper.applyAtomicMentionDelete(
        this.replyContent,
        target?.selectionStart ?? this.replyContent.length,
        event.key
      );

      if (deletion.handled) {
        event.preventDefault();
        this.replyForm.patchValue({ content: deletion.value });
        this.updateReplyMentionPicker(deletion.value, deletion.caret);

        window.setTimeout(() => {
          target?.setSelectionRange(deletion.caret, deletion.caret);
        }, 0);
        return;
      }
    }

    if (!this.replyMentionPickerOpen || this.replyMentionSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.replyMentionActiveIndex = (this.replyMentionActiveIndex + 1) % this.replyMentionSuggestions.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.replyMentionActiveIndex = (this.replyMentionActiveIndex - 1 + this.replyMentionSuggestions.length)
        % this.replyMentionSuggestions.length;
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.selectReplyMention(this.replyMentionSuggestions[this.replyMentionActiveIndex]);
      return;
    }

    if (event.key === 'Escape') {
      this.closeReplyMentionPicker();
    }
  }

  selectReplyMention(candidate: MentionCandidate): void {
    if (!candidate || !this.replyMentionContext) {
      return;
    }

    const applied = this.mentionHelper.applyMention(this.replyContent, this.replyMentionContext, candidate);
    this.replyForm.patchValue({ content: applied.value });
    this.closeReplyMentionPicker();
  }

  onReplyMentionBlur(): void {
    window.setTimeout(() => this.closeReplyMentionPicker(), 120);
  }

  syncReplyOverlay(event: Event, overlay: HTMLElement): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea || !overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  }

  onEditImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editCommentForm.patchValue({ imageUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearEditImage(): void {
    this.editCommentForm.patchValue({ imageUrl: '' });
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

      this.replyForm.patchValue({ imageUrl: gif.gifUrl });
    });
  }

  openEditGifPicker(): void {
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

      this.editCommentForm.patchValue({ imageUrl: gif.gifUrl });
    });
  }

  previewImage(imageUrl?: string | null): void {
    if (!imageUrl) {
      return;
    }
    this.imagePreview.emit(imageUrl);
  }

  private restoreVote(previousVote: 1 | -1 | null, previousScore: number): void {
    this.comment.userVote = previousVote;
    this.comment.voteScore = previousScore;
  }

  private cleanOptional(value: unknown): string | undefined {
    const str = String(value ?? '').trim();
    return str.length ? str : undefined;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { error?: string } })?.error?.error;
    return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
  }

  private updateReplyMentionPicker(value: string, caret: number): void {
    const context = this.mentionHelper.resolveContext(value, caret);
    if (!context) {
      this.closeReplyMentionPicker();
      return;
    }

    const suggestions = this.mentionHelper.filterCandidates(context.query);
    this.replyMentionContext = context;
    this.replyMentionSuggestions = suggestions;
    this.replyMentionPickerOpen = suggestions.length > 0;
    this.replyMentionActiveIndex = 0;
  }

  private closeReplyMentionPicker(): void {
    this.replyMentionPickerOpen = false;
    this.replyMentionSuggestions = [];
    this.replyMentionActiveIndex = 0;
    this.replyMentionContext = null;
  }
}
