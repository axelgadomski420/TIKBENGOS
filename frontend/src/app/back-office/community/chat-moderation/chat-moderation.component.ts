import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { Message } from '../../../front-office/community/models/message.model';
import { AdminConversation, CommunityChatAdminService } from '../services/community-chat-admin.service';
import { AdminExportService } from '../../services/admin-export.service';

@Component({
  selector: 'app-chat-moderation',
  templateUrl: './chat-moderation.component.html',
  styleUrl: './chat-moderation.component.css'
})
export class ChatModerationComponent implements OnInit {
  searchTerm = '';
  statusFilter: 'ALL' | 'OPEN' | 'REVIEW' | 'RESOLVED' = 'ALL';
  queueSort: 'RECENT' | 'OLDEST' | 'MOST_MESSAGES' | 'MOST_DELETED' | 'STATE' = 'RECENT';
  messageVisibility: 'ALL' | 'VISIBLE' | 'REMOVED' = 'ALL';
  messageSort: 'NEWEST' | 'OLDEST' = 'NEWEST';
  loadingConversations = false;
  loadingMessages = false;
  error = '';
  moderationError = '';
  exportNotice = '';

  queue: AdminConversation[] = [];
  selectedConversation?: AdminConversation;
  messages: Message[] = [];
  deletingMessageId?: number;

  get adminUserId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  get filteredQueue(): AdminConversation[] {
    const term = this.searchTerm.trim().toLowerCase();

    const filtered = this.queue.filter((thread) => {
      const matchesTerm =
        !term ||
        this.participantsLabel(thread).toLowerCase().includes(term) ||
        (thread.lastMessagePreview || '').toLowerCase().includes(term);

      const state = this.stateLabel(thread).toUpperCase();
      const matchesState = this.statusFilter === 'ALL' || state === this.statusFilter;

      return matchesTerm && matchesState;
    });

    return [...filtered].sort((a, b) => {
      if (this.queueSort === 'OLDEST') {
        return this.timeValue(a.lastMessageAt) - this.timeValue(b.lastMessageAt);
      }

      if (this.queueSort === 'MOST_MESSAGES') {
        return b.totalMessageCount - a.totalMessageCount;
      }

      if (this.queueSort === 'MOST_DELETED') {
        return b.deletedMessageCount - a.deletedMessageCount;
      }

      if (this.queueSort === 'STATE') {
        const stateDelta = this.stateRank(a) - this.stateRank(b);
        if (stateDelta !== 0) {
          return stateDelta;
        }
        return this.timeValue(b.lastMessageAt) - this.timeValue(a.lastMessageAt);
      }

      return this.timeValue(b.lastMessageAt) - this.timeValue(a.lastMessageAt);
    });
  }

  get filteredMessages(): Message[] {
    const visibleMessages = this.messages.filter((message) => {
      if (this.messageVisibility === 'VISIBLE') {
        return !this.isMessageDeleted(message);
      }

      if (this.messageVisibility === 'REMOVED') {
        return this.isMessageDeleted(message);
      }

      return true;
    });

    return [...visibleMessages].sort((a, b) => {
      if (this.messageSort === 'OLDEST') {
        return this.timeValue(a.createdAt) - this.timeValue(b.createdAt);
      }

      return this.timeValue(b.createdAt) - this.timeValue(a.createdAt);
    });
  }

  get openCount(): number {
    return this.queue.filter((thread) => thread.deletedMessageCount === 0).length;
  }

  get reviewCount(): number {
    return this.queue.filter((thread) => thread.deletedMessageCount > 0 && thread.deletedMessageCount < thread.totalMessageCount).length;
  }

  get resolvedCount(): number {
    return this.queue.filter((thread) => thread.totalMessageCount > 0 && thread.deletedMessageCount === thread.totalMessageCount).length;
  }

  get visibleMessageCount(): number {
    return this.messages.filter((message) => !this.isMessageDeleted(message)).length;
  }

  get removedMessageCount(): number {
    return this.messages.filter((message) => this.isMessageDeleted(message)).length;
  }

  get selectedConversationProgress(): number {
    if (!this.selectedConversation || this.selectedConversation.totalMessageCount <= 0) {
      return 0;
    }

    return Math.round((this.selectedConversation.deletedMessageCount / this.selectedConversation.totalMessageCount) * 100);
  }

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly chatAdminService: CommunityChatAdminService,
    private readonly adminExportService: AdminExportService
  ) {}

  ngOnInit(): void {
    if (!this.adminUserId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadConversations();
  }

  loadConversations(): void {
    const adminUserId = this.adminUserId;
    if (!adminUserId) {
      return;
    }

    this.loadingConversations = true;
    this.error = '';
    this.chatAdminService.getConversations(adminUserId).subscribe({
      next: (conversations) => {
        this.queue = conversations;
        this.loadingConversations = false;

        if (this.queue.length > 0) {
          const preferred = this.selectedConversation
            ? this.queue.find((item) => item.id === this.selectedConversation?.id)
            : this.queue[0];
          if (preferred) {
            this.selectConversation(preferred);
          }
        } else {
          this.selectedConversation = undefined;
          this.messages = [];
        }
      },
      error: () => {
        this.error = 'Unable to load conversation queue.';
        this.loadingConversations = false;
      }
    });
  }

  selectConversation(conversation: AdminConversation): void {
    const adminUserId = this.adminUserId;
    if (!adminUserId) {
      return;
    }

    this.selectedConversation = conversation;
    this.loadingMessages = true;
    this.moderationError = '';
    this.chatAdminService.getConversationMessages(conversation.id, adminUserId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.loadingMessages = false;
      },
      error: () => {
        this.messages = [];
        this.loadingMessages = false;
        this.moderationError = 'Unable to load conversation messages.';
      }
    });
  }

  participantsLabel(conversation: AdminConversation): string {
    return `${conversation.participantOneName} • ${conversation.participantTwoName}`;
  }

  stateLabel(conversation: AdminConversation): 'Open' | 'Review' | 'Resolved' {
    if (conversation.totalMessageCount > 0 && conversation.deletedMessageCount === conversation.totalMessageCount) {
      return 'Resolved';
    }

    if (conversation.deletedMessageCount > 0) {
      return 'Review';
    }

    return 'Open';
  }

  stateToneClass(conversation: AdminConversation): string {
    const state = this.stateLabel(conversation);
    if (state === 'Resolved') {
      return 'state-pill-resolved';
    }
    if (state === 'Review') {
      return 'state-pill-review';
    }
    return 'state-pill-open';
  }

  conversationPreview(conversation: AdminConversation): string {
    const preview = (conversation.lastMessagePreview || '').trim();
    if (preview.length > 0) {
      return preview;
    }

    if (conversation.totalMessageCount === 0) {
      return 'No messages yet.';
    }

    return 'No visible message preview.';
  }

  messageAuthorLabel(message: Message): string {
    const senderName = (message.senderName || '').trim();
    if (senderName) {
      return senderName;
    }

    if (this.selectedConversation) {
      if (message.senderId === this.selectedConversation.participantOneId) {
        return this.selectedConversation.participantOneName;
      }
      if (message.senderId === this.selectedConversation.participantTwoId) {
        return this.selectedConversation.participantTwoName;
      }
    }

    return 'Unknown user';
  }

  exportQueueToExcel(): void {
    const rows = this.filteredQueue.map((thread) => [
      this.participantsLabel(thread),
      this.stateLabel(thread),
      thread.totalMessageCount,
      thread.deletedMessageCount,
      this.formatDate(thread.lastMessageAt),
      this.conversationPreview(thread)
    ]);

    if (!rows.length) {
      this.exportNotice = 'No conversations available to export.';
      return;
    }

    this.adminExportService.exportExcel(
      `chat-moderation-queue-${this.timestampForFilename()}`,
      ['Participants', 'State', 'Messages', 'Deleted', 'Last Activity', 'Preview'],
      rows
    );
    this.exportNotice = 'Conversation queue exported to Excel.';
  }

  exportQueueToPdf(): void {
    const rows = this.filteredQueue.map((thread) => [
      this.participantsLabel(thread),
      this.stateLabel(thread),
      thread.totalMessageCount,
      thread.deletedMessageCount,
      this.formatDate(thread.lastMessageAt)
    ]);

    if (!rows.length) {
      this.exportNotice = 'No conversations available to export.';
      return;
    }

    this.adminExportService.exportPdf(
      'Chat Moderation Queue Export',
      ['Participants', 'State', 'Messages', 'Deleted', 'Last Activity'],
      rows,
      `Filter: ${this.statusFilter} | Sort: ${this.queueSort}`
    );
    this.exportNotice = 'Conversation queue exported to PDF.';
  }

  exportSelectedConversationToExcel(): void {
    if (!this.selectedConversation) {
      this.exportNotice = 'Select a conversation to export messages.';
      return;
    }

    const rows = this.filteredMessages.map((message) => [
      this.formatDate(message.createdAt),
      this.messageAuthorLabel(message),
      this.isMessageDeleted(message) ? 'Removed' : 'Visible',
      (message.content || 'Attachment only').replace(/\s+/g, ' ').trim(),
      message.attachments?.length || 0
    ]);

    if (!rows.length) {
      this.exportNotice = 'No messages available to export in this conversation.';
      return;
    }

    this.adminExportService.exportExcel(
      `chat-conversation-${this.filenameSafe(this.participantsLabel(this.selectedConversation))}-${this.timestampForFilename()}`,
      ['Timestamp', 'Sender', 'Status', 'Message', 'Attachments'],
      rows
    );
    this.exportNotice = 'Selected conversation exported to Excel.';
  }

  exportSelectedConversationToPdf(): void {
    if (!this.selectedConversation) {
      this.exportNotice = 'Select a conversation to export messages.';
      return;
    }

    const rows = this.filteredMessages.map((message) => [
      this.formatDate(message.createdAt),
      this.messageAuthorLabel(message),
      this.isMessageDeleted(message) ? 'Removed' : 'Visible',
      (message.content || 'Attachment only').replace(/\s+/g, ' ').trim()
    ]);

    if (!rows.length) {
      this.exportNotice = 'No messages available to export in this conversation.';
      return;
    }

    this.adminExportService.exportPdf(
      `${this.participantsLabel(this.selectedConversation)} Conversation Export`,
      ['Timestamp', 'Sender', 'Status', 'Message'],
      rows,
      `Message filter: ${this.messageVisibility} | Message sort: ${this.messageSort}`
    );
    this.exportNotice = 'Selected conversation exported to PDF.';
  }

  moderateDelete(message: Message): void {
    const adminUserId = this.adminUserId;
    if (!adminUserId || this.isMessageDeleted(message) || !this.selectedConversation) {
      return;
    }

    this.deletingMessageId = message.id;
    this.moderationError = '';
    this.chatAdminService.moderateDeleteMessage(message.id, adminUserId).subscribe({
      next: (updatedMessage) => {
        this.messages = this.messages.map((current) =>
          current.id === updatedMessage.id ? updatedMessage : current
        );

        const activeConversationId = this.selectedConversation?.id;

        if (this.selectedConversation) {
          this.selectedConversation = {
            ...this.selectedConversation,
            deletedMessageCount: this.selectedConversation.deletedMessageCount + 1
          };
        }

        this.queue = this.queue.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                deletedMessageCount: conversation.deletedMessageCount + 1
              }
            : conversation
        );

        this.deletingMessageId = undefined;
      },
      error: () => {
        this.moderationError = 'Unable to moderate this message right now.';
        this.deletingMessageId = undefined;
      }
    });
  }

  trackByThreadId(_: number, thread: AdminConversation): number {
    return thread.id;
  }

  trackByMessageId(_: number, message: Message): number {
    return message.id;
  }

  isMessageDeleted(message: Message): boolean {
    const maybeDeleted = message as Message & { deletedAt?: string | null };
    return !!maybeDeleted.deletedAt;
  }

  messageBody(message: Message): string {
    if (this.isMessageDeleted(message)) {
      return 'Message deleted by moderation.';
    }

    return message.content || 'Attachment only';
  }

  private stateRank(conversation: AdminConversation): number {
    const state = this.stateLabel(conversation);
    if (state === 'Open') {
      return 0;
    }

    if (state === 'Review') {
      return 1;
    }

    return 2;
  }

  private timeValue(value?: string): number {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  private timestampForFilename(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private filenameSafe(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'conversation';
  }
}
