/**
 * Czat — BENGOS Chat.
 *
 * Model pochodzi z TIKTAK (Conversation, ConvUser, Message) i jest lepszy od
 * tego z TIKMESS, więc to on obowiązuje. Zachowanie z TIKMESS, które zostaje:
 * obecność liczona po stronie odbiorcy (nieprzeczytane nie rośnie, gdy
 * odbiorca patrzy na rozmowę) i emoji jako osobny typ wiadomości.
 */

export interface Conversation {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  iconUrl: string | null;
  participantIds: string[];
  /** Stan bieżącego użytkownika w tej rozmowie. */
  self: ParticipantState;
  lastMessage: Message | null;
  updatedAt: string;
}

export interface ParticipantState {
  unreadCount: number;
  /** Czy ktoś z rozmowy ma ją otwartą. Czat 1:1 używa tego, żeby nie liczyć
   * nieprzeczytanych u odbiorcy, który właśnie patrzy na ekran. */
  isLive: boolean;
  lastSeenAt: string | null;
}

export type MessageKind =
  | { type: "text"; body: string }
  | { type: "image"; url: string; caption: string | null; width: number | null; height: number | null }
  | { type: "voice"; url: string; durationSeconds: number; transcript: string | null }
  | { type: "sign"; clipUrl: string; gloss: string }
  | { type: "morse"; pattern: string; decoded: string }
  | { type: "system"; body: string };

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  /** Wiadomość, na którą ta odpowiada. Płasko — jeden poziom cytowania. */
  replyToId: string | null;
  reactions: MessageReaction[];
  /** Tłumaczenie jest właściwością wiadomości, nie oddzielnym bytem:
   * użytkownik widzi tekst w swoim języku, a oryginał zostaje. */
  translations: Record<string, string>;
  createdAt: string;
  deletedAt: string | null;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface SendMessageRequest {
  kind: MessageKind;
  replyToId?: string;
}

/**
 * Tryby dostępności w rozmowie. Włączane osobno dla każdej rozmowy, bo
 * inna rozmowa to inny rozmówca i inne potrzeby.
 */
export interface ConversationAccessibility {
  conversationId: string;
  captions: boolean;
  tts: boolean;
  signPreview: boolean;
  morseAlerts: boolean;
}
