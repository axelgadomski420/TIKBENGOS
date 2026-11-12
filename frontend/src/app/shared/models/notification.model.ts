export interface AppNotification {
  id: number;
  userId: number;
  actorUserId?: number | null;
  type: 'COMMUNITY_POST_CREATED' | 'COMMUNITY_POST_COMMENT' | 'COMMUNITY_COMMENT_REPLY' | 'COMMUNITY_CHAT_MESSAGE' | string;
  title: string;
  message: string;
  deepLink?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPageResponse {
  notifications: AppNotification[];
  unreadCount: number;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
