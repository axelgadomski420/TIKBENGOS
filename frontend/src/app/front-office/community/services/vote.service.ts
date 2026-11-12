import { Injectable } from '@angular/core';
import { PostService } from './post.service';

@Injectable({ providedIn: 'root' })
export class VoteService {
  constructor(private postService: PostService) {}

  vote(targetId: number, targetType: 'POST' | 'COMMENT', value: 1 | -1, userId: number) {
    return this.postService.vote(targetId, targetType, value, userId);
  }

  remove(targetId: number, targetType: 'POST' | 'COMMENT', userId: number) {
    return this.postService.removeVote(targetId, targetType, userId);
  }
}
