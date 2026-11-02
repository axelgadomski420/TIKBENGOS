"use client";

import Link from "next/link";
import { useId, useState } from "react";

import type { Identity } from "@bengos/core";
import { ROLE_LABELS } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

/**
 * Tożsamość na ekranie profilu.
 *
 * Dwie rzeczy, które ten komponent robi i jedna, której nie robi:
 *
 * 1. Pokazuje tożsamość z sesji — łącznie z rolami, bo one decydują
 *    o uprawnieniach i użytkownik ma prawo wiedzieć, co ma.
 * 2. Pozwala zmienić trzy pola, które API już przyjmuje (`PATCH /users/me`):
 *    nazwę wyświetlaną, biografię i witrynę. Reszta pól tożsamości jest
 *    zarządzana gdzie indziej i tutaj się ich nie rusza.
 *
 * NIE pokazuje ani nie zmienia adresu e-mail. E-mail służy do logowania,
 * a jego zmiana wymaga ponownej weryfikacji — to inny proces niź zmiana
 * nazwy wyświetlanej. Udawanie, że to to samo, byłoby błędem.
 */
export function ProfileIdentity() {
  const { identity, isAuthenticated, logout } = useSession();

  if (!isAuthenticated || !identity) {
    return (
      <section aria-labelledby="profile-guest" className="bengos-surface-card">
        <h2
          id="profile-guest"
          className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
        >
          Nie jesteś zalogowany
        </h2>
        <p className="mt-2 text-[var(--bengos-text-muted)]">
          Ten ekran pokazuje dane konta, więc nie ma tu czego wyświetlić bez sesji.
          Możesz się rozejrzeć bez konta — pulpit, ustawienia wyglądu i dostępności
          działają niezależnie od zalogowania.
        </p>
        <Link
          href="/login"
          className="bengos-touch-target mt-4 inline-flex rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
        >
          Zaloguj się
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-identity" className="bengos-surface-card">
      <h2
        id="profile-identity"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Twoja tożsamość
      </h2>

      <dl className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <dt className="text-[var(--bengos-text-muted)]">Nazwa:</dt>
          <dd className="font-[var(--bengos-weight-medium)]">
            {identity.displayName ?? identity.username}
          </dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="text-[var(--bengos-text-muted)]">Uchwyt:</dt>
          <dd>@{identity.username}</dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="text-[var(--bengos-text-muted)]">Role:</dt>
          <dd>{identity.roles.map((role) => ROLE_LABELS[role]).join(", ")}</dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="text-[var(--bengos-text-muted)]">Tryb odbioru:</dt>
          <dd>
            {identity.perception === "both"
              ? "Obraz i dźwięk"
              : identity.perception === "audio-only"
                ? "Tylko dźwięk"
                : "Tylko tekst"}
          </dd>
        </div>
      </dl>

      <EditIdentity initial={identity} />

      <button
        type="button"
        onClick={() => void logout()}
        className="bengos-touch-target mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
      >
        Wyloguj się
      </button>
    </section>
  );
}

function EditIdentity({ initial }: { initial: Identity }) {
  const displayNameId = useId();
  const bioId = useId();
  const websiteId = useId();

  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch<Identity>("/api/users/me", {
        method: "PATCH",
        body: { displayName, bio, website },
      });
      // Nie przeładowujemy strony: te trzy pola nie wpływają na tożsamość
      // w sesji po stronie serwera, a przeładowanie zabrałoby komunikat.
      setMessage({ tone: "ok", text: "Zapisane." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text:
          cause instanceof ApiRequestError
            ? cause.error.message
            : "Nie udało się zapisać zmian.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={save}>
      <div>
        <label htmlFor={displayNameId} className="block font-[var(--bengos-weight-medium)]">
          Nazwa wyświetlana
        </label>
        <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          To widzŕ inni obok Twoich treści. Uchwyt `@{initial.username}` zostaje bez zmian.
        </p>
        <input
          id={displayNameId}
          type="text"
          value={displayName}
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
        />
      </div>

      <div>
        <label htmlFor={bioId} className="block font-[var(--bengos-weight-medium)]">
          Biografia
        </label>
        <textarea
          id={bioId}
          value={bio}
          maxLength={500}
          rows={3}
          onChange={(event) => setBio(event.target.value)}
          className="mt-1 w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor={websiteId} className="block font-[var(--bengos-weight-medium)]">
          Witryna
        </label>
        <input
          id={websiteId}
          type="url"
          value={website}
          maxLength={200}
          placeholder="https://"
          onChange={(event) => setWebsite(event.target.value)}
          className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
        />
      </div>

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-[var(--bengos-size-caption)] ${
            message.tone === "error" ? "text-[var(--bengos-danger)]" : "text-[var(--bengos-success)]"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="bengos-touch-target rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60"
      >
        {busy ? "Zapisuję…" : "Zapisz zmiany"}
      </button>
    </form>
  );
}
