import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../models/post.model';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent {
  @Input() post!: Post;
  @Input() currentUserId?: number;
  @Input() canPinPost = false;
  @Output() voted = new EventEmitter<{ value: 1 | -1; postId: number }>();
  selectedImageUrl: string | null = null;
  pinError = '';
  pinning = false;

  constructor(
    private postService: PostService,
    private router: Router
  ) {}

  get authorLabel(): string {
    const name = this.post?.authorName?.trim();
    return name && name.length > 0 ? name : 'Member';
  }

  vote(value: 1 | -1): void {
    this.voted.emit({ value, postId: this.post.id });
  }

  togglePin(): void {
    if (!this.currentUserId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.pinning = true;
    this.pinError = '';
    const request = this.post.pinned
      ? this.postService.unpin(this.post.id, this.currentUserId)
      : this.postService.pin(this.post.id, this.currentUserId);

    request.subscribe({
      next: (updatedPost) => {
        this.post.pinned = updatedPost.pinned;
        this.pinning = false;
      },
      error: () => {
        this.pinError = 'Unable to update pinned state.';
        this.pinning = false;
      }
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
}
