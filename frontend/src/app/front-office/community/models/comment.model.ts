export interface Comment {
  id: number;
  postId: number;
  parentCommentId?: number;
  userId: number;
  authorName?: string;
  content: string;
  imageUrl?: string;
  voteScore: number;
  acceptedAnswer: boolean;
  userVote?: 1 | -1 | null;
  replies: Comment[];
  createdAt: string;
  depth?: number;
}
