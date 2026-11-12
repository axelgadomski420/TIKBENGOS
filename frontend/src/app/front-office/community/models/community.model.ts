export interface Community {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
  bannerUrl?: string;
  iconUrl?: string;
  createdAt: string;
  userRole?: 'MEMBER' | 'MODERATOR' | 'CREATOR' | null;
}

export interface Flair {
  id: number;
  name: string;
  color: string;
  textColor: string;
}

export interface CommunityRule {
  id: number;
  title: string;
  description: string;
  ruleOrder: number;
}

export interface CommunityMember {
  userId: number;
  name: string;
  role: 'MEMBER' | 'MODERATOR' | 'CREATOR';
  joinedAt: string;
}

export interface CommunityNotificationPreferences {
  communityId: number;
  communitySlug: string;
  emailOnPostReply: boolean;
  emailOnMention: boolean;
  weeklyDigestEnabled: boolean;
}
