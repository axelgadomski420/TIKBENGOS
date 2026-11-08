"use client";

import Link from "next/link";

import type { ApiError } from "@bengos/core";

import { apiFetch, useAsync } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

interface ContinueItem {
  id: string;
  kind: "video" | "music" | "post" | "pull-request";
  title: string;
  href: string;
  updatedAt: string;
}

const KIND_LABELS: Record<ContinueItem["kind"], string> = {
  video: "Wideo",
  music: "Muzyka",
  post: "Post",
  "pull-request": "Pull request",
};

/**
 * Karta „Kontynuuj”.
 *
 * Najważniejsza karta na pulpicie i dlatego jedyna, która ma własny stan
 * pusty oraz własne ponowienie. Pula niedokończonej pracy to cała wartość
 * pulpitu: użytkownik, który wraca, chce zobaczyć, co zostawił, a nie
 * kolejny raz to samo wideo.
 *
 * ── STANY MAJĄ WSPÓLNY KSZTAŁT ─────────────────────────────────────────
 * Ładowanie, pustka i błąd to trzy odpowiedzi na to samo pytanie, więc stoją
 * w tym samym miejscu i mają tę samą wagę typograficzną. Stan ma podpis
 * i zdanie — widać, że to odpowiedź systemu, a nie dane.
 *
 * `role="status"` jest na wszystkich trzech, bo każda z nich zmienia się
 * w odpowiedzi na akcję użytkownika (wejście na ekran, ponowienie).
 *
 * ── TARCZE ZE ZNAKAMI, TEN SAM JEZYK CO RESZTA PULPITU ─────────────────
 * Ten komponent był jedynym miejscem na pulpicie bez tarcz: nazwy rodzaju
 * pracy stały jako goły tekst, a wejścia do studia były prostokątami.
 * Teraz każdy stan i każda pozycja listy niesie znak — spójnie z menu
 * głównym, obiema nawigacjami i kartą „Stwórz teraz”.
 */

type IconProps = { className?: string };

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconVideo({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="6" width="12" height="12" rx="3" />
      <path d="m15 10 6-3v10l-6-3" />
    </svg>
  );
}

function IconMusic({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}

function IconPost({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M5 5h14M5 10h14M5 15h8" />
    </svg>
  );
}

function IconProposal({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M8.2 7.2 15.8 11M8.2 16.8 15.8 13" />
    </svg>
  );
}

function IconPlus({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconLogin({ className }: IconProps) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l4 4-4 4M14 12H4" />
    </svg>
  );
}

const KIND_ICONS: Record<ContinueItem["kind"], (p: IconProps) => React.JSX.Element> = {
  video: IconVideo,
  music: IconMusic,
  post: IconPost,
  "pull-request": IconProposal,
};

function Trap({ children, Icon }: { children: React.ReactNode; Icon: (p: IconProps) => React.JSX.Element }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)]">
      <Icon className="size-5" />
      {children}
    </span>
  );
}

export function ContinueCard() {
  const { isAuthenticated } = useSession();

  const state = useAsync<ContinueItem[]>(
    (signal) => apiFetch<ContinueItem[]>("/api/feed/continue", { signal }),
    [isAuthenticated],
    isAuthenticated,
  );

  return (
    <section aria-labelledby="continue" className="bengos-surface-card">
      <h2
        id="continue"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Kontynuuj
      </h2>

      {!isAuthenticated ? (
        <StateBlock
          Icon={IconLogin}
          eyebrow="Wymaga konta"
          text="Po zalogowaniu zobaczysz tu niedokończone projekty, wersje robocze, generacje muzyki i otwarte pull requesty."
          action={{ href: "/login", label: "Zaloguj się" }}
        />
      ) : state.loading ? (
        <StateBlock Icon={IconProposal} eyebrow="Wczytuję" text="Zbieram niedokończone prace…" />
      ) : state.error ? (
        <ContinueError error={state.error} onRetry={state.reload} />
      ) : !state.data || state.data.length === 0 ? (
        <StateBlock
          Icon={IconPlus}
          eyebrow="Pusto"
          text="Nie masz nic niedokończonego. Gdy zaczniesz wideo, utwór albo projekt, wróci tu, żebyś nie musiał go szukać."
          action={{ href: "/studio", label: "Zacznij coś" }}
        />
      ) : (
        <ul className="mt-3 -mx-2">
          {state.data.map((item) => {
            const Icon = KIND_ICONS[item.kind] ?? IconPost;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex min-h-[var(--bengos-touch-target-min)] items-center gap-3 rounded-[var(--bengos-radius-control)] px-2 py-2.5 transition-colors duration-[var(--bengos-motion-fast)] hover:bg-[var(--bengos-surface-sunken)]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] text-[var(--bengos-accent)] transition-colors duration-[var(--bengos-motion-fast)] group-hover:border-[var(--bengos-accent)]">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block bengos-eyebrow text-[var(--bengos-accent)]">
                      {KIND_LABELS[item.kind]}
                    </span>
                    <span className="block truncate" title={item.title}>
                      {item.title}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Wspólny kształt odpowiedzi systemu: tarcza, podpis, zdanie i opcjonalne
 * wyjście.
 *
 * Wyjście jest tu istotne z tego samego powodu, dla którego `error.tsx` ma
 * przycisk ponowienia: stan bez drogi wyjścia to ślepy zaułek.
 */
function StateBlock({
  Icon,
  eyebrow,
  text,
  action,
}: {
  Icon: (p: IconProps) => React.JSX.Element;
  eyebrow: string;
  text: string;
  action?: { href: string; label: string };
}) {
  return (
    <div role="status" className="mt-3 flex items-start gap-3">
      <Trap Icon={Icon} />
      <div className="min-w-0 flex-1">
        <p className="bengos-eyebrow">{eyebrow}</p>
        <p className="mt-1 text-[var(--bengos-text-muted)]">{text}</p>
        {action ? (
          <Link
            href={action.href}
            className="bengos-touch-target mt-2 inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)] hover:border-[var(--bengos-border-strong)]"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Błąd z ponowieniem. Nie chowamy go w cichy komunikat — jeżeli dane się nie
 * wczytały, użytkownik ma to wiedzieć i mieć czym spróbować ponownie.
 * „Coś poszło nie tak” bez przycisku to ślepy zaułek.
 */
function ContinueError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-4 py-3"
    >
      <p className="bengos-eyebrow text-[var(--bengos-danger)]">Nie udało się wczytać</p>
      <p className="mt-1">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-[var(--bengos-touch-target-min)] rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
