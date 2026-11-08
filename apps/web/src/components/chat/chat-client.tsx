"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError, Conversation, Message } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useRealtime } from "@/lib/realtime-client";
import { useSession } from "@/lib/session-context";

/**
 * Klient czatu — Etap 4 (tekst).
 *
 * Źródło prawdy to kontrakt `@bengos/core`: Conversation i Message z
 * `packages/core/src/chat.ts`. Każde żądanie idzie przez apiFetch, które
 * dokłada CSRF i tłumaczy błędy — ten komponent nie dotyka fetch.
 *
 * Wiadomości przychodzące z kanału WS (`useRealtime`) trafiają do
 * otwartego wątku albo odświeżają listę rozmów. Zdarzenia z kanału są
 * UZUPEŁNIENIEM, nie źródłem prawdy: to REST zapisuje i zwraca stan,
 * kanał tylko przyspiesza. Dlatego przy "message.new" z innego wątku
 * po prostu przewijamy listę rozmów, zamiast składać Conversation
 * z pojedynczej wiadomości — odpytanie API jest jednym żądaniem
 * i nie może rozjechać się z bazą.
 */

interface AuthorInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ConversationPage {
  items: Conversation[];
  participants: Record<string, AuthorInfo>;
}

interface MessagePage {
  items: Message[];
  hasMore: boolean;
}

interface RealtimeEvent {
  type?: string;
  message?: Message;
}

function bodyOf(message: Message): string {
  // Unia typów z kontraktu. Dziś dochodzi text i system; reszta
  // (image, voice, sign, morse) dojdzie z mediami — pokaż to uczciwie.
  if (message.kind.type === "text") return message.kind.body;
  if (message.kind.type === "system") return message.kind.body;
  return "Ten typ wiadomości dojdzie w kolejnym etapie.";
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export function ChatClient() {
  const { identity, isAuthenticated } = useSession();
  const realtime = useRealtime(isAuthenticated);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [participants, setParticipants] = useState<Record<string, AuthorInfo>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [contacts, setContacts] = useState<AuthorInfo[] | null>(null);
  const [showContacts, setShowContacts] = useState(false);

  // Wątek w efectach czyta aktualnie wybraną rozmowę, a nie stan z
  // domknięcia. Bez tego zdarzenie WS mogłoby trafić do wątku, który
  // użytkownik właśnie opuścił.
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const reloadConversations = useCallback(async () => {
    try {
      const page = await apiFetch<ConversationPage>("/api/chat/conversations");
      setConversations(page.items ?? []);
      setParticipants(page.participants ?? {});
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void reloadConversations();
    } else {
      setLoadingList(false);
    }
  }, [isAuthenticated, reloadConversations]);

  const markRead = useCallback(async (conversationId: string) => {
    // Oznaczenie przeczytanym jest best-effort: porażka nie blokuje
    // czytania wątku, licznik dogoni następne wejście.
    try {
      await apiFetch("/api/chat/conversations/" + conversationId + "/read", {
        method: "POST",
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, self: { ...c.self, unreadCount: 0 } } : c))
      );
    } catch {
      // celowo cicho — patrz komentarz wyżej
    }
  }, []);

  const loadThread = useCallback(
    async (conversationId: string) => {
      setLoadingThread(true);
      setError(null);
      try {
        const page = await apiFetch<MessagePage>(
          "/api/chat/conversations/" + conversationId + "/messages?limit=50"
        );
        setMessages(page.items ?? []);
        setHasMore(Boolean(page.hasMore));
        await markRead(conversationId);
      } catch (err) {
        if (err instanceof ApiRequestError) setError(err.error);
      } finally {
        setLoadingThread(false);
      }
    },
    [markRead]
  );

  useEffect(() => {
    if (selectedId) {
      void loadThread(selectedId);
    } else {
      setMessages([]);
      setHasMore(false);
    }
  }, [selectedId, loadThread]);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || !selectedId) return;
    try {
      const page = await apiFetch<MessagePage>(
        "/api/chat/conversations/" + selectedId + "/messages?before=" + oldest.id + "&limit=50"
      );
      setMessages((prev) => [...(page.items ?? []), ...prev]);
      setHasMore(Boolean(page.hasMore));
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.error);
    }
  }, [messages, selectedId]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setDraft("");
    try {
      const created = await apiFetch<Message>(
        "/api/chat/conversations/" + selectedId + "/messages",
        { method: "POST", body: { kind: { type: "text", body }, replyToId: null } }
      );
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      setConversations((prev) => {
        const rest = prev.filter((c) => c.id !== selectedId);
        const current = prev.find((c) => c.id === selectedId);
        if (!current) return prev;
        return [{ ...current, lastMessage: created, updatedAt: created.createdAt }, ...rest];
      });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error);
        setDraft(body); // szkic wraca — użytkownik nie traci tekstu
      }
    } finally {
      setSending(false);
    }
  }, [draft, selectedId, sending]);

  const removeMessage = useCallback(async (messageId: string) => {
    try {
      await apiFetch("/api/chat/messages/" + messageId, { method: "DELETE" });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m))
      );
      setAnnouncement("Wiadomość usunięta.");
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.error);
    }
  }, []);

  const startConversation = useCallback(
    async (participantId: string) => {
      setError(null);
      try {
        const conversation = await apiFetch<Conversation>("/api/chat/conversations", {
          method: "POST",
          body: { kind: "direct", participantIds: [participantId], title: null },
        });
        await reloadConversations();
        setShowContacts(false);
        setSelectedId(conversation.id);
      } catch (err) {
        if (err instanceof ApiRequestError) setError(err.error);
      }
    },
    [reloadConversations]
  );

  const openContacts = useCallback(async () => {
    setShowContacts((prev) => !prev);
    if (contacts === null) {
      try {
        const list = await apiFetch<AuthorInfo[]>("/api/chat/contacts");
        setContacts(list ?? []);
      } catch (err) {
        if (err instanceof ApiRequestError) setError(err.error);
      }
    }
  }, [contacts]);

  // Zdarzenia z kanału: nowa wiadomość w otwartym wątku dokładamy na żywo,
  // w innym — przewijamy listę rozmów przez API (patrz komentarz w nagłówku).
  useEffect(() => {
    const event = realtime.lastMessage as RealtimeEvent | null | undefined;
    if (!event || event.type !== "message.new" || !event.message) return;
    const incoming = event.message;
    if (incoming.conversationId === selectedRef.current) {
      setMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
      );
      void markRead(incoming.conversationId);
      setAnnouncement("Nowa wiadomość w tej rozmowie.");
    } else {
      void reloadConversations();
      setAnnouncement("Nowa wiadomość w innej rozmowie.");
    }
  }, [realtime.lastMessage, reloadConversations, markRead]);

  if (!isAuthenticated) {
    return (
      <section className="card p-6" aria-labelledby="chat-login-title">
        <h1 id="chat-login-title" className="text-lg font-semibold">
          Czat jest dla zalogowanych
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Zaloguj się, aby rozmawiać. Bez konta nie ma tożsamości, a rozmowy
          są przypisane do osób — gość nie ma z kim rozmawiać.
        </p>
      </section>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const titleOf = (conversation: Conversation): string => {
    if (conversation.kind === "group" && conversation.title) return conversation.title;
    const otherIds = conversation.participantIds.filter((id) => id !== identity?.id);
    const names = otherIds.map((id) => participants[id]?.displayName ?? participants[id]?.username ?? "Użytkownik");
    return names.length > 0 ? names.join(", ") : "Rozmowa";
  };

  return (
    <section aria-labelledby="chat-title" className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <h1 id="chat-title" className="text-lg font-semibold">
          Czat
        </h1>
        <button
          type="button"
          className="btn btn-primary"
          aria-expanded={showContacts}
          onClick={() => void openContacts()}
        >
          {showContacts ? "Zamknij kontakty" : "Nowa rozmowa"}
        </button>
      </header>

      <Announcement message={announcement} />
      {error ? (
        <p role="alert" className="rounded border border-[var(--danger)] p-2 text-sm">
          {error.message}
        </p>
      ) : null}

      {showContacts ? (
        <div className="card p-4">
          <h2 className="text-sm font-semibold">Kontakty</h2>
          {contacts === null ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Wczytywanie…</p>
          ) : contacts.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Nikogo jeszcze nie obserwujesz. Zacznij od feedu — przycisk
              „Obserwuj” u autora wpisu daje Ci tu kontakt.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void startConversation(contact.id)}
                  >
                    {contact.displayName ?? contact.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card max-h-[70vh] overflow-y-auto p-3" aria-label="Lista rozmów">
          {loadingList ? (
            <p className="p-2 text-sm text-[var(--muted)]">Wczytywanie rozmów…</p>
          ) : conversations.length === 0 ? (
            <p className="p-2 text-sm text-[var(--muted)]">
              Brak rozmów. Kliknij „Nowa rozmowa”, aby zacząć.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const unread = conversation.self.unreadCount;
                const active = conversation.id === selectedId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      className={
                        "w-full rounded p-2 text-left text-sm " +
                        (active ? "bg-[var(--accent)] text-[var(--bg)]" : "hover:bg-[var(--surface)]")
                      }
                      onClick={() => setSelectedId(conversation.id)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{titleOf(conversation)}</span>
                        {unread > 0 ? (
                          <span
                            className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-xs font-semibold text-[var(--bg)]"
                            aria-label={unread + " nieprzeczytanych"}
                          >
                            {unread}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                        {conversation.lastMessage
                          ? bodyOf(conversation.lastMessage)
                          : "Brak wiadomości"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="card flex max-h-[70vh] flex-col p-4">
          {selected ? (
            <>
              <header className="border-b border-[var(--surface)] pb-2">
                <h2 className="text-sm font-semibold">{titleOf(selected)}</h2>
                <p className="text-xs text-[var(--muted)]">
                  Wiadomości tekstowe. Załączniki, głos i tłumaczenia dojdą
                  w kolejnych etapach.
                </p>
              </header>

              <div className="mt-2 flex-1 overflow-y-auto" aria-live="polite">
                {hasMore ? (
                  <button type="button" className="btn mb-2" onClick={() => void loadOlder()}>
                    Wczytaj starsze
                  </button>
                ) : null}
                {loadingThread ? (
                  <p className="text-sm text-[var(--muted)]">Wczytywanie wiadomości…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Brak wiadomości. Napisz pierwszą.</p>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((message) => {
                      const own = message.senderId === identity?.id;
                      const author = participants[message.senderId];
                      return (
                        <li key={message.id} className={"flex " + (own ? "justify-end" : "justify-start")}>
                          <div className="max-w-[80%] rounded border border-[var(--surface)] p-2">
                            {!own ? (
                              <p className="text-xs font-semibold">
                                {author?.displayName ?? author?.username ?? "Użytkownik"}
                              </p>
                            ) : null}
                            <p className="text-sm">
                              {message.deletedAt ? "Wiadomość usunięta" : bodyOf(message)}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                              {timeLabel(message.createdAt)}
                              {own && !message.deletedAt ? (
                                <button
                                  type="button"
                                  className="underline"
                                  onClick={() => void removeMessage(message.id)}
                                >
                                  Usuń
                                </button>
                              ) : null}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <form
                className="mt-2 flex items-end gap-2 border-t border-[var(--surface)] pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label className="sr-only" htmlFor="chat-draft">
                  Treść wiadomości
                </label>
                <textarea
                  id="chat-draft"
                  className="input min-h-[44px] flex-1 resize-y"
                  value={draft}
                  maxLength={2000}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Napisz wiadomość…"
                />
                <button type="submit" className="btn btn-primary" disabled={sending || draft.trim().length === 0}>
                  {sending ? "Wysyłam…" : "Wyślij"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Wybierz rozmowę z listy albo zacznij nową.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
