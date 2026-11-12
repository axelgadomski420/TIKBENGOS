import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Conversation } from '../../models/message.model';
import { CommunityRealtimeService } from '../../services/community-realtime.service';
import { MessagingService, ChatDirectoryUser, DirectMessageNotificationPreferences } from '../../services/messaging.service';
import { AuthService } from '../../../../auth/auth.service';

interface ChatCandidate {
  userId: number;
  name: string;
  roleLabel: string;
  email: string;
}

@Component({
  selector: 'app-inbox',
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css'
})
export class InboxComponent implements OnInit {
  conversations: Conversation[] = [];
  chatCandidates: ChatCandidate[] = [];
  onlineUserIds = new Set<number>();

  loading = true;
  error = '';
  recipientsLoading = true;
  recipientsError = '';
  startingChatUserId: number | null = null;
  directMessagePreferences?: DirectMessageNotificationPreferences;
  loadingDirectMessagePreferences = true;
  savingDirectMessagePreference = false;
  directMessagePreferenceError = '';

  pickerOpen = false;
  searchTerm = '';
  private presenceSubscription?: Subscription;

  get userId(): number | undefined { return this.auth.getCurrentUser()?.id; }

  get groupedConversations(): Array<{ key: string; label: string; items: Conversation[] }> {
    const unread = this.conversations.filter((conversation) => conversation.unreadCount > 0);
    const read = this.conversations.filter((conversation) => conversation.unreadCount <= 0);
    const recent = read.filter((conversation) => this.isRecentConversation(conversation));
    const earlier = read.filter((conversation) => !this.isRecentConversation(conversation));

    return [
      { key: 'unread', label: 'Unread', items: unread },
      { key: 'recent', label: 'Recent', items: recent },
      { key: 'earlier', label: 'Earlier', items: earlier }
    ].filter((group) => group.items.length > 0);
  }

  get unreadConversationCount(): number {
    return this.conversations.filter((conversation) => conversation.unreadCount > 0).length;
  }

  get activeNowCount(): number {
    return this.conversations.filter((conversation) => this.isCounterpartOnline(conversation)).length;
  }

  get filteredCandidates(): ChatCandidate[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.chatCandidates;
    }

    return this.chatCandidates.filter((candidate) => {
      const inName = candidate.name.toLowerCase().includes(query);
      const inEmail = candidate.email.toLowerCase().includes(query);
      const inRole = candidate.roleLabel.toLowerCase().includes(query);
      return inName || inEmail || inRole;
    });
  }

  constructor(
    private messagingService: MessagingService,
    private communityRealtimeService: CommunityRealtimeService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.messagingService.getInbox(userId).subscribe({
      next: (data) => {
        this.conversations = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load inbox.';
        this.loading = false;
      }
    });

    this.messagingService.getPresenceSnapshot(userId).pipe(
      catchError(() => of([] as number[]))
    ).subscribe((onlineIds) => {
      this.onlineUserIds = new Set(onlineIds);
    });

    this.communityRealtimeService.connect(userId);
    this.presenceSubscription = this.communityRealtimeService.observePresence().subscribe((event) => {
      if (event.online) {
        this.onlineUserIds.add(event.userId);
      } else {
        this.onlineUserIds.delete(event.userId);
      }
      this.onlineUserIds = new Set(this.onlineUserIds);
    });

    this.loadChatCandidates(userId);
    this.loadDirectMessagePreferences(userId);
  }

  ngOnDestroy(): void {
    this.presenceSubscription?.unsubscribe();
  }

  open(conversationId: number): void {
    this.router.navigate(['/app/community/chat', conversationId]);
  }

  openPicker(): void {
    this.pickerOpen = true;
  }

  closePicker(): void {
    this.pickerOpen = false;
    this.searchTerm = '';
  }

  startChatWith(candidate: ChatCandidate): void {
    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.startingChatUserId = candidate.userId;
    this.messagingService.startOrGet(candidate.userId, userId).subscribe({
      next: (conversation) => {
        this.startingChatUserId = null;
        this.closePicker();
        this.open(conversation.id);
      },
      error: () => {
        this.startingChatUserId = null;
        this.recipientsError = 'Unable to start this chat right now. Please try again.';
      }
    });
  }

  trackByConversationId(_: number, conversation: Conversation): number {
    return conversation.id;
  }

  trackByCandidateId(_: number, candidate: ChatCandidate): number {
    return candidate.userId;
  }

  formatCandidateMeta(candidate: ChatCandidate): string {
    return candidate.email ? `${candidate.roleLabel} • ${candidate.email}` : candidate.roleLabel;
  }

  counterpartUserId(conversation: Conversation): number | null {
    const userId = this.userId;
    if (!userId) {
      return null;
    }
    return conversation.participantOneId === userId ? conversation.participantTwoId : conversation.participantOneId;
  }

  isCounterpartOnline(conversation: Conversation): boolean {
    const counterpartId = this.counterpartUserId(conversation);
    return counterpartId ? this.onlineUserIds.has(counterpartId) : false;
  }

  relativeTimeLabel(conversation: Conversation): string {
    if (!conversation.lastMessageAt) {
      return 'New chat';
    }

    const now = Date.now();
    const target = new Date(conversation.lastMessageAt).getTime();
    if (Number.isNaN(target)) {
      return 'Recent';
    }

    const diffMinutes = Math.max(0, Math.round((now - target) / 60000));
    if (diffMinutes < 1) {
      return 'Just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return new Date(conversation.lastMessageAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  previewPrefix(conversation: Conversation): string {
    if (!conversation.lastMessagePreview) {
      return 'Say hello';
    }

    if (conversation.lastMessageSenderId === this.userId) {
      return `You: ${conversation.lastMessagePreview}`;
    }

    return conversation.lastMessagePreview;
  }

  sectionSummary(groupKey: string): string {
    if (groupKey === 'unread') {
      return 'Replies waiting for you.';
    }

    if (groupKey === 'recent') {
      return 'Conversations from the last few days.';
    }

    return 'Older threads you can reopen anytime.';
  }

  updateDirectMessagePreference(enabled: boolean): void {
    const userId = this.userId;
    if (!userId || !this.directMessagePreferences || this.savingDirectMessagePreference) {
      return;
    }

    const previous = this.directMessagePreferences.emailOnUnreadDirectMessage;
    this.directMessagePreferences = { emailOnUnreadDirectMessage: enabled };
    this.savingDirectMessagePreference = true;
    this.directMessagePreferenceError = '';

    this.messagingService.updateDirectMessagePreferences({ emailOnUnreadDirectMessage: enabled }, userId).subscribe({
      next: (preferences) => {
        this.directMessagePreferences = preferences;
        this.savingDirectMessagePreference = false;
      },
      error: () => {
        this.directMessagePreferences = { emailOnUnreadDirectMessage: previous };
        this.directMessagePreferenceError = 'Unable to save direct message notification settings.';
        this.savingDirectMessagePreference = false;
      }
    });
  }

  private loadChatCandidates(userId: number): void {
    this.recipientsLoading = true;
    this.recipientsError = '';

    this.messagingService.getUserDirectory().pipe(
      catchError(() => {
        this.recipientsLoading = false;
        this.recipientsError = 'Unable to load users for new chats.';
        return of([] as ChatDirectoryUser[]);
      })
    ).subscribe((users) => {
      this.chatCandidates = users
        .filter((user) => user.id !== userId)
        .map((user) => ({
          userId: user.id,
          name: this.buildDisplayName(user),
          roleLabel: this.normalizeRole(user.role),
          email: (user.email || '').trim()
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.recipientsLoading = false;
    });
  }

  private loadDirectMessagePreferences(userId: number): void {
    this.loadingDirectMessagePreferences = true;
    this.directMessagePreferenceError = '';

    this.messagingService.getDirectMessagePreferences(userId).pipe(
      catchError(() => {
        this.directMessagePreferenceError = 'Unable to load direct message notification settings.';
        this.loadingDirectMessagePreferences = false;
        return of({ emailOnUnreadDirectMessage: true } as DirectMessageNotificationPreferences);
      })
    ).subscribe((preferences) => {
      this.directMessagePreferences = preferences;
      this.loadingDirectMessagePreferences = false;
    });
  }

  private buildDisplayName(user: ChatDirectoryUser): string {
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    const fullName = `${first} ${last}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }

    if (user.email && user.email.trim().length > 0) {
      return user.email.trim();
    }

    return `User #${user.id}`;
  }

  private normalizeRole(role?: string): string {
    const normalized = (role || '').trim().toUpperCase();
    if (!normalized) {
      return 'User';
    }

    return normalized.charAt(0) + normalized.slice(1).toLowerCase();
  }

  private isRecentConversation(conversation: Conversation): boolean {
    if (!conversation.lastMessageAt) {
      return false;
    }

    const target = new Date(conversation.lastMessageAt).getTime();
    if (Number.isNaN(target)) {
      return false;
    }

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - target <= threeDaysMs;
  }
}
