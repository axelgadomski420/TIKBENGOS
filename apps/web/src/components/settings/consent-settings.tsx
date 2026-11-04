"use client";

import { useEffect, useState } from "react";

import type { ApiError, Identity } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { useSession } from "@/lib/session-context";

/**
 * Zgody zapisywane na koncie.
 *
 * Ekran ustawień mówił o zgodach, ale nic ich nie zapisywało — model zgód
 * istniał już w API i w bazie, natomiast nie było sposobu, żeby je włączyć.
 * Ten komponent to domyka.
 *
 * Świadomie NIE ma tu przełącznika powiadomień push. `stage-1.md` mówi, że
 * kanał push nie został jeszcze wybrany: nie wiadomo, czy to usługa
 * zewnętrzna, czy własna implementacja na kluczach VAPID. Zgoda na coś,
 * czego nie ma, byłaby obietnicą bez pokrycia — więc zamiast przełącznika
 * jest zdanie o stanie prac.
 *
 * Zgody wymagają zalogowania, bo są przypisane do konta. Bez sesji komponent
 * pokazuje, dlaczego nie ma czego ustawiać, a nie atrapę przełączników.
 */

const TOGGLES = [
  {
    key: "camera" as const,
    label: "Kamera",
    description: "Potrzebna modułom Studio i Access — nagrywanie wideo i podgląd migów.",
  },
  {
    key: "microphone" as const,
    label: "Mikrofon",
    description: "Potrzebny do nagrywania dźwięku i pisania głosem.",
  },
  {
    key: "github" as const,
    label: "GitHub",
    description: "Potrzebny modułowi Dev do repozytoriów i agenta kodującego.",
  },
];

export function ConsentSettings() {
  const { identity, isAuthenticated } = useSession();
  const [consents, setConsents] = useState<Identity["consents"] | null>(
    identity?.consents ?? null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Tożsamość może dojechać po pierwszym renderze (odczyt po stronie serwera
  // zwraca `null`, gdy nie ma sesji). Wtedy zgody trzeba wziąć z niej.
  useEffect(() => {
    if (identity?.consents) setConsents(identity.consents);
  }, [identity]);

  async function toggle(key: "camera" | "microphone" | "github", value: boolean) {
    setBusy(key);
    setError(null);
    setAnnouncement("");
    try {
      const updated = await apiFetch<Identity>("/api/users/me/consents", {
        method: "PATCH",
        body: { [key]: value },
      });
      setConsents(updated.consents);
      const label = TOGGLES.find((item) => item.key === key)?.label ?? key;
      setAnnouncement(`${label}: zgoda ${value ? "zapisana" : "odwołana"}.`);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się zapisać zgody." },
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="consents" aria-labelledby="consents-title" className="bengos-surface-card">
      <Announcement message={announcement} />
      <h2 id="consents-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
        Zgody
      </h2>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        Każda zgoda jest osobna i odwoływalna. Rola mówi, co wolno; zgoda mówi, na co sam
        pozwoliłeś — do korzystania z kamery czy GitHuba potrzebne jest jedno i drugie.
      </p>

      {!isAuthenticated ? (
        <p className="mt-4 text-[var(--bengos-text-muted)]">
          Zgody są przypisane do konta, więc pojawią się po zalogowaniu. Możesz się rozejrzeć
          bez konta — ustawienia wyglądu i dostępności działają niezależnie od sesji.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-4">
            {TOGGLES.map((toggleItem) => {
              const checked = consents ? consents[toggleItem.key] : false;
              return (
                <li key={toggleItem.key} className="flex items-start gap-3">
                  <input
                    id={`consent-${toggleItem.key}`}
                    type="checkbox"
                    checked={checked}
                    disabled={busy !== null}
                    onChange={(event) => void toggle(toggleItem.key, event.target.checked)}
                    className="mt-1 size-5 shrink-0 accent-[var(--bengos-accent)]"
                  />
                  <label htmlFor={`consent-${toggleItem.key}`} className="cursor-pointer">
                    <span className="block font-[var(--bengos-weight-medium)]">
                      {toggleItem.label}
                    </span>
                    <span className="block text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                      {toggleItem.description}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-3 py-2 text-[var(--bengos-size-caption)]"
            >
              {error.message}
            </p>
          ) : null}

          <p className="mt-4 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
            Powiadomienia push: kanał nie został jeszcze wybrany (usługa zewnętrzna albo własna
            implementacja na kluczach VAPID). Nie ma zgody na coś, czego nie ma.
          </p>
        </>
      )}
    </section>
  );
}
