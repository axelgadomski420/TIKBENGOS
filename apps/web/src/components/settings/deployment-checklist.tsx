"use client";

import { useEffect, useState } from "react";

import { PROVIDERS } from "@bengos/core";

import { Announcement } from "@/components/announcement";
import { usePreferences } from "@/lib/preferences-context";

/**
 * Przewodnik wdrożenia po instalacji na własnym serwerze.
 *
 * Aplikacja ma być uruchamiana na własnej maszynie, więc ekran musi
 * odpowiadać na trzy pytania właściciela: gdzie wpisać klucze dostawców,
 * od czego zależy stabilność pracy i co zostanie utracone, jeżeli zmieni się
 * `FIELD_ENCRYPTION_KEY`. Trzecie pytanie jest najważniejsze — ta zmiana jest
 * nieodwracalna dla zapisanych kluczy.
 *
 * Sprawdzenia dotyczą wyłącznie tej przeglądarki i nie wysyłają nigdzie
 * żadnych danych: HTTPS to adres strony, powiadomienia to zgoda przeglądarki,
 * a ograniczenie ruchu to preferencja dostępności. Nic tutaj nie udaje
 * pomiaru stanu serwera.
 */
export function DeploymentChecklist() {
  const { accessibility } = usePreferences();
  const [https, setHttps] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    setHttps(window.location.protocol === "https:");
    setNotificationPermission(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    );
  }, []);

  return (
    <section aria-labelledby="deployment-title" className="bengos-surface-card">
      <Announcement message={announcement} />
      <h2 id="deployment-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
        Wdrożenie na własnym serwerze
      </h2>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        TIKBENGOS uruchamiasz u siebie. Poniższe punkty opisują stan tej przeglądarki, nie
        stan serwera — stan usług sprawdzasz w ich własnych logach.
      </p>

      <ul className="mt-4 space-y-2">
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-[var(--bengos-accent)]">—</span>
          <span>
            Adres strony:{" "}
            {https === null
              ? "sprawdzam…"
              : https
                ? "HTTPS. Kamera, mikrofon i powiadomienia dostaną zgodę przeglądarki."
                : "HTTP. Kamera, mikrofon i powiadomienia nie zadziałają — dodaj certyfikat przed testami na telefonie."}
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-[var(--bengos-accent)]">—</span>
          <span>
            Zgoda na powiadomienia w tej przeglądarce:{" "}
            {notificationPermission === null
              ? "sprawdzam…"
              : notificationPermission === "granted"
                ? "udzielona."
                : notificationPermission === "denied"
                  ? "odmówiona — aplikacja nic nie wyśle, dopóki nie zmienisz tego w ustawieniach przeglądarki."
                  : notificationPermission === "unsupported"
                    ? "ta przeglądarka nie obsługuje powiadomień."
                    : "jeszcze o nią nie pytano."}
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true" className="text-[var(--bengos-accent)]">—</span>
          <span>
            Ograniczenie ruchu ustawione w aplikacji:{" "}
            {accessibility.reducedMotion ? "włączone." : "wyłączone."}
          </span>
        </li>
      </ul>

      <h3 className="mt-6 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
        Kolejność wdrożenia
      </h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--bengos-text-muted)]">
        <li>PostgreSQL 16+, Redis 7+, Python 3.12 i Node 20 na maszynie.</li>
        <li>Usługa API: migracje, konto administratora, uruchomienie serwera.</li>
        <li>Usługa czasu rzeczywistego: kanał WebSocket na Redisie.</li>
        <li>Interfejs: adres API oraz adres kanału czasu rzeczywistego.</li>
        <li>Klucze dostawców: w ustawieniach aplikacji, nie w plikach środowiska.</li>
        <li>
          Klucz szyfrowania pól: ustaw raz i zachowaj kopię. Zmiana tej wartości czyni
          zapisane klucze dostawców nieczytelnymi.
        </li>
      </ol>

      <h3 className="mt-6 text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
        Klucze dostawców
      </h3>
      <p className="mt-2 text-[var(--bengos-text-muted)]">
        Katalog dostawców zawiera {PROVIDERS.length} wpisów, także te bez potwierdzonego
        adresu. Wpis bez adresu da się zapisać, ale wywołania nim nie będzie.
      </p>
      <p className="mt-3">
        <a
          href="/settings/keys"
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-accent)]"
        >
          Zarządzaj kluczami dostawców
        </a>
      </p>

      <p className="mt-6">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bengos-touch-target inline-flex rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4"
        >
          Sprawdź ponownie w tej przeglądarce
        </button>
      </p>
    </section>
  );
}
