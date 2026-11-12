import { Injectable, NgZone } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { Message } from '../models/message.model';
import { PresenceEvent, SeenEvent, TypingEvent } from '../models/realtime.model';
import { environment } from '../../../../environments/environment';
import { AppNotification } from '../../../shared/models/notification.model';

@Injectable({ providedIn: 'root' })
export class CommunityRealtimeService {
  private readonly wsUrl = environment.communityWsUrl;

  private client?: Client;
  private connectedUserId?: number;
  private presenceSubscription?: StompSubscription;

  private readonly presenceSubject = new Subject<PresenceEvent>();
  private readonly connectedSubject = new ReplaySubject<void>(1);

  presence$ = this.presenceSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  constructor(private zone: NgZone) {}

  connect(userId: number): void {
    if (this.connectedUserId === userId && this.client && (this.client.connected || this.client.active)) {
      return;
    }

    this.disconnect();

    this.connectedUserId = userId;
    this.client = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.connectedSubject.next();
        this.presenceSubscription?.unsubscribe();
        this.presenceSubscription = this.client?.subscribe('/topic/community.presence', (message: IMessage) => {
          this.pushPresence(message);
        });

        this.client?.publish({
          destination: '/app/community/presence.connect',
          body: JSON.stringify({ userId })
        });
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    if (!this.client) {
      return;
    }

    this.presenceSubscription?.unsubscribe();
    this.presenceSubscription = undefined;
    this.client.deactivate();
    this.client = undefined;
    this.connectedUserId = undefined;
  }

  publishTyping(conversationId: number, typing: boolean): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/community/typing',
      body: JSON.stringify({ conversationId, typing })
    });
  }

  subscribeToConversationTyping(conversationId: number, handler: (event: TypingEvent) => void): () => void {
    const topic = `/topic/community.conversation.${conversationId}.typing`;

    let subscription: StompSubscription | undefined;
    const subscribeNow = () => {
      if (!this.client?.connected) {
        return;
      }
      subscription = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const parsed = JSON.parse(message.body) as TypingEvent;
          handler(parsed);
        } catch {
          // Ignore malformed events to keep chat resilient.
        }
      });
    };

    if (this.client?.connected) {
      subscribeNow();
    } else {
      const waitHandle = window.setInterval(() => {
        if (this.client?.connected) {
          window.clearInterval(waitHandle);
          subscribeNow();
        }
      }, 200);

      return () => {
        window.clearInterval(waitHandle);
        subscription?.unsubscribe();
      };
    }

    return () => subscription?.unsubscribe();
  }

  subscribeToConversationMessages(conversationId: number, handler: (message: Message) => void): () => void {
    const topic = `/topic/community.conversation.${conversationId}.messages`;

    let subscription: StompSubscription | undefined;
    const subscribeNow = () => {
      if (!this.client?.connected) {
        return;
      }
      subscription = this.client.subscribe(topic, (frame: IMessage) => {
        try {
          const parsed = JSON.parse(frame.body) as Message;
          handler(parsed);
        } catch {
          // Ignore malformed events to keep chat resilient.
        }
      });
    };

    if (this.client?.connected) {
      subscribeNow();
    } else {
      const waitHandle = window.setInterval(() => {
        if (this.client?.connected) {
          window.clearInterval(waitHandle);
          subscribeNow();
        }
      }, 200);

      return () => {
        window.clearInterval(waitHandle);
        subscription?.unsubscribe();
      };
    }

    return () => subscription?.unsubscribe();
  }

  subscribeToConversationSeen(conversationId: number, handler: (event: SeenEvent) => void): () => void {
    const topic = `/topic/community.conversation.${conversationId}.seen`;

    let subscription: StompSubscription | undefined;
    const subscribeNow = () => {
      if (!this.client?.connected) {
        return;
      }
      subscription = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const parsed = JSON.parse(message.body) as SeenEvent;
          handler(parsed);
        } catch {
          // Ignore malformed events to keep chat resilient.
        }
      });
    };

    if (this.client?.connected) {
      subscribeNow();
    } else {
      const waitHandle = window.setInterval(() => {
        if (this.client?.connected) {
          window.clearInterval(waitHandle);
          subscribeNow();
        }
      }, 200);

      return () => {
        window.clearInterval(waitHandle);
        subscription?.unsubscribe();
      };
    }

    return () => subscription?.unsubscribe();
  }

  subscribeToUserNotifications(userId: number, handler: (event: AppNotification) => void): () => void {
    const topic = `/topic/community.notifications.${userId}`;
    return this.subscribeWhenConnected(
      topic,
      (message: IMessage) => JSON.parse(message.body) as AppNotification,
      handler
    );
  }

  subscribeToNotificationCount(userId: number, handler: (count: number) => void): () => void {
    const topic = `/topic/community.notifications.${userId}.count`;
    return this.subscribeWhenConnected(
      topic,
      (message: IMessage) => {
        const numeric = Number(message.body);
        if (!Number.isNaN(numeric)) {
          return numeric;
        }

        const parsed = JSON.parse(message.body);
        return Number(parsed);
      },
      handler
    );
  }

  private pushPresence(message: IMessage): void {
    try {
      const parsed = JSON.parse(message.body) as PresenceEvent;
      this.presenceSubject.next(parsed);
    } catch {
      // Ignore malformed events to keep inbox/chat usable.
    }
  }

  observePresence(): Observable<PresenceEvent> {
    return this.presence$;
  }

  private subscribeWhenConnected<T>(
    topic: string,
    parse: (message: IMessage) => T,
    handler: (value: T) => void
  ): () => void {
    let subscription: StompSubscription | undefined;
    let connectedSubscription: Subscription | undefined;

    const subscribeNow = () => {
      if (!this.client?.connected) {
        return;
      }

      subscription?.unsubscribe();
      subscription = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const parsed = parse(message);
          this.zone.run(() => handler(parsed));
        } catch {
          // Ignore malformed events to keep UI resilient.
        }
      });
    };

    connectedSubscription = this.connected$.subscribe(() => subscribeNow());

    if (this.client?.connected) {
      subscribeNow();
    }

    return () => {
      connectedSubscription?.unsubscribe();
      subscription?.unsubscribe();
    };
  }
}
