"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";
import { validateEmail, validatePassword, validateUsername } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

/**
 * Formularz logowania i rejestracji.
 *
 * ── ZNAK MARKI JEST NA GÓRZE EKRANU, NIE TUTAJ ──────────────────────────
 * Ten komponent NIE rysuje znaku. Był tu znak 88 px, a `login/page.tsx`
 * trzyma drugi nad kartą — dwa znaki marki na jednym ekranie to nie ozdoba,
 * a powtórzenie: oko nie wie, na co patrzeć. Znak jest jeden i stoi wyżej.
 *
 * ── WALIDACJA PRZED WYSŁANIEM, REGUŁAMI Z KONTRAKTU ─────────────────────
 * Reguły pochodzą z `@bengos/core` — tych samych, których pilnuje serwer.
 * Druga kopia rozjechałaby się z pierwszym dniem, więc jej nie ma.
 *
 * ── DOSTAWCY PRZYCHODZĄ Z SERWERA ───────────────────────────────────────
 * Lista pochodzi z `GET /api/auth/oauth/providers`. Ekran nie pokazuje
 * przycisku dla dostawcy, którego serwer nie obsługuje. Gdy brakuje kluczy,
 * zamiast martwego przycisku pojawia się zdanie, które mówi dlaczego —
 * przycisk, który nie reaguje, wygląda na zepsuty, a nie na niegotowy.
 *
 * ── PO REJESTRACJI WCHODZI SIĘ Z `?welcome=1` ───────────────────────────
 * Samo przeładowanie na pulpit niczego nie potwierdzało: użytkownik nie
 * wiedział, czy konto powstało, ani jakim uchwytem się loguje. Parametr
 * `welcome` uruchamia na pulpicie pasek powitania, który mówi jedno i drugie.
 * Po zalogowaniu parametru NIE MA — powitanie jest dla nowego konta, a nie
 * dla każdego wejścia.
 */

type Mode = "login" | "register";

interface FormState {
  identifier: string;
  username: string;
  email: string;
  password: string;
}

interface OAuthProvider {
  id: string;
  label: string;
  configured: boolean;
}

const EMPTY_FORM: FormState = { identifier: "", username: "", email: "", password: "" };

const OAUTH_FAILURE_DEFAULT =
  "Dostawca nie potwierdził logowania. Możesz spróbować ponownie albo zalogować się hasłem.";

const OAUTH_MESSAGES: Record<string, string> = {
  odmowa: OAUTH_FAILURE_DEFAULT,
  "brak-danych": "Dostawca nie odesłał wszystkich potrzebnych danych. Spróbuj ponownie.",
  "brak-konfiguracji": "Logowanie przez dostawcę nie jest skonfigurowane na tym serwerze.",
  stan: "Sesja logowania wygasła albo została przerwana. Spróbuj ponownie.",
  "blad-sieci": "Nie udało się dokończyć logowania — serwer nie odpowiedział.",
};

function messageForReason(reason: string): string {
  return OAUTH_MESSAGES[reason] ?? OAUTH_FAILURE_DEFAULT;
}

/** Znak dostawcy. Nieznany dostawca dostaje kropkę — nigdy pustkę. */
function ProviderMark({ id }: { id: string }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
        <path fill="currentColor" opacity="0.75" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
        <path fill="currentColor" opacity="0.5" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
        <path fill="currentColor" opacity="0.85" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A5.9 5.9 0 0 1 12 6Z" />
      </svg>
    );
  }
  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.7-1.4-2.2-.2-4.6-1.1-4.6-5a4 4 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6a4 4 0 0 1 1 2.7c0 3.9-2.3 4.8-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
      </svg>
    );
  }
  return <span aria-hidden="true" className="size-2 rounded-full bg-current" />;
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<ApiError | null>(null);

  const isRegister = mode === "register";
  const configured = providers.filter((provider) => provider.configured);

  // Błąd tego żądania NIE jest pokazywany: formularz z hasłem działa
  // niezależnie, a komunikat o braku listy tylko by mylił.
  useEffect(() => {
    let cancelled = false;
    apiFetch<OAuthProvider[]>("/api/auth/oauth/providers")
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Powód odmowy zapisany przez trasę adresu zwrotnego. Jednorazowy — po
  // odczytaniu znika z adresu, żeby odświeżenie nie pokazywało komunikatu
  // po zdarzeniu, którego już nie ma.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("oauth");
    if (!reason) return;
    setOauthError({ code: "bad_request", message: messageForReason(reason) });
    window.history.replaceState({}, "", "/login");
  }, []);

  const update = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }, []);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setServerError(null);
    setShowPassword(false);
  }, []);

  const validate = useCallback((): Partial<Record<keyof FormState, string>> => {
    if (isRegister) {
      return {
        username: validateUsername(form.username)?.message,
        email: validateEmail(form.email)?.message,
        password: validatePassword(form.password)?.message,
      };
    }
    return {
      identifier: form.identifier.trim() ? undefined : "Podaj nazwę użytkownika albo adres email.",
      password: form.password ? undefined : "Podaj hasło.",
    };
  }, [form, isRegister]);

  async function startOAuth(provider: string) {
    setOauthBusy(provider);
    setOauthError(null);
    try {
      const { authorizeUrl } = await apiFetch<{ authorizeUrl: string }>(
        `/api/auth/oauth/${provider}/start`,
        { method: "POST" },
      );
      // Pełne przejście, nie żądanie w tle: dostawca ustawia własne
      // ciasteczka i wraca osobnym adresem.
      window.location.assign(authorizeUrl);
    } catch (cause) {
      setOauthError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się zacząć logowania." },
      );
      setOauthBusy(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setBusy(true);
    setServerError(null);

    try {
      if (isRegister) {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: {
            username: form.username.trim().toLowerCase(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          },
        });
        // `?welcome=1` pokazuje na pulpicie pasek powitania z uchwytem —
        // potwierdzenie, że konto powstało, i informacja, jak się logować.
        window.location.assign("/?welcome=1");
        return;
      }

      await apiFetch("/api/auth/login", {
        method: "POST",
        body: { identifier: form.identifier.trim().toLowerCase(), password: form.password },
      });

      // Pełne przejście, nie zmiana stanu: tożsamość czyta się przy pierwszym
      // renderze, więc tylko przeładowanie daje spójny widok bez migotania
      // „nie zalogowany” na ekranie, który już wie, że użytkownik wszedł.
      window.location.assign("/");
    } catch (cause) {
      const apiError =
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal" as const, message: "Nieznany błąd." };

      setServerError(apiError);
      if (apiError.field && apiError.field in form) {
        setFieldErrors((prev) => ({ ...prev, [apiError.field as keyof FormState]: apiError.message }));
      }
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="login-heading" className="bengos-surface-card w-full text-left">
      <h1
        id="login-heading"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
      >
        {isRegister ? "Załóż konto" : "Zaloguj się"}
      </h1>
      <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        {isRegister
          ? "Jedno konto dla feedu, studia, czatu, asystenta i dev."
          : "Wejdź do swojego pulpitu — konto masz już założone."}
      </p>

      {oauthError ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-warning)] bg-[var(--bengos-surface-sunken)] px-3 py-2 text-[var(--bengos-size-caption)]"
        >
          {oauthError.message}
        </p>
      ) : null}

      {configured.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {configured.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                disabled={busy || oauthBusy !== null}
                onClick={() => void startOAuth(provider.id)}
                className="bengos-touch-target w-full gap-2 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-4 font-[var(--bengos-weight-medium)] transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-accent)] disabled:opacity-60"
              >
                <ProviderMark id={provider.id} />
                {oauthBusy === provider.id
                  ? `Przechodzę do ${provider.label}…`
                  : `Kontynuuj z ${provider.label}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {providers.length > 0 && configured.length === 0 ? (
        <p className="mt-5 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 py-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          Logowanie przez Google albo GitHuba pojawi się, gdy administrator doda klucze do
          tego serwera. Na razie konto zakładasz emailem.
        </p>
      ) : null}

      {configured.length > 0 ? (
        <p className="my-5 flex items-center gap-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--bengos-border)]" />
          albo emailem
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--bengos-border)]" />
        </p>
      ) : (
        <div className="mt-5" />
      )}

      {/*
        Zakładki w jednym pasku z ciemniejszym tłem. Aktywna jest PODNIESIONA
        na tło karty — widać, która jest wybrana, zanim przeczyta się podpis.
      */}
      <div
        role="tablist"
        aria-label="Tryb"
        className="flex gap-1 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-1"
      >
        {(["login", "register"] as const).map((value) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={busy}
              onClick={() => switchMode(value)}
              className={`min-h-[var(--bengos-touch-target-min)] flex-1 rounded-[var(--bengos-radius-control)] px-4 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
                active
                  ? "bg-[var(--bengos-surface-raised)] font-[var(--bengos-weight-medium)] text-[var(--bengos-text)]"
                  : "text-[var(--bengos-text-muted)] hover:text-[var(--bengos-text)]"
              }`}
            >
              {value === "login" ? "Logowanie" : "Rejestracja"}
            </button>
          );
        })}
      </div>

      {serverError && !serverError.field ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] bg-[var(--bengos-surface-sunken)] px-3 py-2 text-[var(--bengos-size-caption)]"
        >
          {serverError.message}
        </p>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
        {isRegister ? (
          <>
            <Field
              id="login-username"
              label="Nazwa użytkownika"
              hint="3–30 znaków: małe litery, cyfry i podkreślenie."
              value={form.username}
              onChange={(value) => update("username", value)}
              autoComplete="username"
              error={fieldErrors.username}
              disabled={busy}
            />
            <Field
              id="login-email"
              label="Adres email"
              hint="Nigdy nie pokazuje się w profilu publicznym."
              type="email"
              value={form.email}
              onChange={(value) => update("email", value)}
              autoComplete="email"
              error={fieldErrors.email}
              disabled={busy}
            />
          </>
        ) : (
          <Field
            id="login-identifier"
            label="Nazwa użytkownika albo email"
            hint="Oba działają — nie musisz pamiętać, którym się rejestrowałeś."
            value={form.identifier}
            onChange={(value) => update("identifier", value)}
            autoComplete="username"
            error={fieldErrors.identifier}
            disabled={busy}
          />
        )}

        <Field
          id="login-password"
          label="Hasło"
          hint={isRegister ? "Co najmniej 12 znaków. Unikaj samego ciągu cyfr." : ""}
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={(value) => update("password", value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          error={fieldErrors.password}
          disabled={busy}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              className="bengos-touch-target rounded-[var(--bengos-radius-control)] px-2 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]"
            >
              {showPassword ? "Ukryj" : "Pokaż"}
            </button>
          }
        />

        <button
          type="submit"
          disabled={busy}
          className="bengos-touch-target w-full rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] transition-opacity duration-[var(--bengos-motion-fast)] disabled:opacity-60"
        >
          {busy ? "Pracuję…" : isRegister ? "Utwórz konto" : "Zaloguj się"}
        </button>
      </form>

      <p className="mt-4 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Hasło jest hashowane na serwerze i nigdy nie wraca w żadnej odpowiedzi. Każde konto
        ma własny uchwyt, własną sesję i własne dane.
      </p>
    </section>
  );
}

/**
 * Pole formularza.
 *
 * Etykieta nad polem, podpowiedź pod etykietą, błąd pod polem — tak jak
 * wymaga brief. Błąd jedzie w `role="alert"` i podnosi `aria-invalid`
 * na polu, więc czytnik ogłosi go razem z fokusem.
 *
 * Tło pola to `surface-sunken`, czyli CIEMNIEJSZE niż karta. Poprzednio
 * pole i karta dzieliły prawie ten sam kolor i granica była nie do
 * zauważenia — użytkownik nie widział, gdzie kończy się karta, a zaczyna
 * pole. Fokus dostaje `--bengos-focus-ring`, bo brief zabrania
 * `outline: none` bez zamiennika.
 */
function Field({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  disabled,
  trailing,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete: string;
  error?: string;
  disabled: boolean;
  trailing?: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block font-[var(--bengos-weight-medium)]">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          {hint}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? hintId}
          className={`min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border bg-[var(--bengos-surface-sunken)] px-3 text-[var(--bengos-text)] outline-none transition-colors duration-[var(--bengos-motion-fast)] focus-visible:border-[var(--bengos-focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--bengos-focus-ring)] disabled:opacity-60 ${
            error ? "border-[var(--bengos-danger)]" : "border-[var(--bengos-border)]"
          }`}
        />
        {trailing}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
