"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";
import { validateEmail, validatePassword, validateUsername } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

/**
 * Formularz logowania i rejestracji.
 *
 * Mieszka w osobnym pliku, bo `login/page.tsx` musi zostać komponentem
 * serwerowym — eksport `metadata` nie działa w pliku z "use client".
 *
 * Walidacja dzieje się PRZED wysłaniem i używa reguł z `@bengos/core`, tych
 * samych, których pilnuje serwer. Druga kopia reguł rozjechałaby się
 * z pierwszym dniem, więc jej nie ma.
 *
 * Błąd trafia do regionu `role="alert"`, żeby osoba korzystająca
 * z czytnika ekranu dowiedziała się o odrzuceniu — bez tego widzi tylko,
 * że nic się nie stało.
 *
 * ── NAJPIERW DOSTAWCA, POTEM HASŁO ──────────────────────────────────────
 * Kolejność odzwierciedla to, jak dziś wygląda zakładanie konta: większość
 * osób nie wymyśla nowego hasła, jeśli może kliknąć dwa razy. Przyciski
 * dostawców stoją więc NAD formularzem i są pierwsze w kolejności czytania
 * dla czytnika ekranu — nie schowane pod nim.
 *
 * ── DOSTAWCY PRZYCHODZĄ Z SERWERA ───────────────────────────────────────
 * Lista przycisków pochodzi z `GET /api/auth/oauth/providers`. Dzięki temu
 * ekran nie pokazuje przycisku dla dostawcy, którego serwer nie obsługuje.
 * Gdy serwer nie ma kluczy, przycisk JEST widoczny, ale nieaktywny i mówi
 * dlaczego — ukrycie go nie powiedziałoby, że taka droga istnieje.
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

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<ApiError | null>(null);

  const isRegister = mode === "register";

  // Lista dostawców. Błąd tego żądania NIE jest pokazywany użytkownikowi:
  // formularz z hasłem działa niezależnie, a komunikat o braku listy
  // tylko by go mylił. Zero przycisków jest tu poprawnym stanem.
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

  // Powód odmowy zapisany w sesji przez trasę adresu zwrotnego.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("oauth");
    if (!reason) return;
    const messages: Record<string, string> = {
      odmowa: "Dostawca nie potwierdził logowania. Możesz spróbować ponownie albo zalogować się hasłem.",
      "brak-danych": "Dostawca nie odesłał wszystkich potrzebnych danych. Spróbuj ponownie.",
      "brak-konfiguracji": "Logowanie przez dostawcę nie jest skonfigurowane na tym serwerze.",
      stan: "Sesja logowania wygasła albo została przerwana. Spróbuj ponownie.",
      "blad-sieci": "Nie udało się dokończyć logowania — serwer nie odpowiedział.",
    };
    setOauthError({ code: "bad_request", message: messages[reason] ?? messages.odmowa });
    // Powód jest jednorazowy — po odczytaniu znika z adresu, żeby odświeżenie
    // nie pokazywało komunikatu po zdarzeniu, którego już nie ma.
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
      identifier: form.identifier.trim()
        ? undefined
        : "Podaj nazwę użytkownika albo adres email.",
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
      } else {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: { identifier: form.identifier.trim().toLowerCase(), password: form.password },
        });
      }

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
    <section aria-labelledby="login-heading" className="bengos-surface-card">
      <h1
        id="login-heading"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)]"
      >
        {isRegister ? "Utwórz konto" : "Zaloguj się"}
      </h1>
      <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Jedno konto dla wszystkich modułów: feedu, studia, czatu, create, dev i access.
      </p>

      {oauthError ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-warning)] px-3 py-2 text-[var(--bengos-size-caption)]"
        >
          {oauthError.message}
        </p>
      ) : null}

      {providers.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {providers.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                disabled={!provider.configured || busy || oauthBusy !== null}
                onClick={() => void startOAuth(provider.id)}
                className="bengos-touch-target w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 font-[var(--bengos-weight-medium)] transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)] disabled:opacity-60"
              >
                {oauthBusy === provider.id
                  ? `Przechodzę do ${provider.label}…`
                  : `Kontynuuj z ${provider.label}`}
              </button>
              {!provider.configured ? (
                <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                  Ten serwer nie ma jeszcze kluczy do {provider.label}. Możesz założyć konto
                  hasłem — dostawcę podłączymy, gdy administrator doda klucze.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {providers.length > 0 ? (
        <p className="my-5 flex items-center gap-3 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--bengos-border)]" />
          albo emailem
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--bengos-border)]" />
        </p>
      ) : null}

      <div role="tablist" aria-label="Tryb" className="mt-5 flex gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          disabled={busy}
          onClick={() => switchMode("login")}
          className={`min-h-[var(--bengos-touch-target-min)] flex-1 rounded-[var(--bengos-radius-control)] border px-4 transition-colors duration-[var(--bengos-motion-fast)] ${
            !isRegister
              ? "border-[var(--bengos-accent)] bg-[var(--bengos-accent-muted)] font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]"
              : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
          }`}
        >
          Zaloguj się
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          disabled={busy}
          onClick={() => switchMode("register")}
          className={`min-h-[var(--bengos-touch-target-min)] flex-1 rounded-[var(--bengos-radius-control)] border px-4 transition-colors duration-[var(--bengos-motion-fast)] ${
            isRegister
              ? "border-[var(--bengos-accent)] bg-[var(--bengos-accent-muted)] font-[var(--bengos-weight-medium)] text-[var(--bengos-accent)]"
              : "border-[var(--bengos-border)] text-[var(--bengos-text-muted)]"
          }`}
        >
          Utwórz konto
        </button>
      </div>

      {serverError && !serverError.field ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-3 py-2 text-[var(--bengos-size-caption)]"
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
          hint={isRegister ? "Co najmniej 12 znaków." : ""}
          type="password"
          value={form.password}
          onChange={(value) => update("password", value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          error={fieldErrors.password}
          disabled={busy}
        />

        <button
          type="submit"
          disabled={busy}
          className="bengos-touch-target w-full rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60"
        >
          {busy ? "Pracuję…" : isRegister ? "Utwórz konto" : "Zaloguj się"}
        </button>
      </form>

      <p className="mt-4 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        Hasło jest hashowane na serwerze i nigdy nie wraca w żadnej odpowiedzi. Zapisane klucze
        dostawców są szyfrowane i pokazywane dokładnie raz. Konto zakładasz jedno — dostawcę
        możesz podpiąć później.
      </p>
    </section>
  );
}

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
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId ?? hintId}
        className={`mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border bg-[var(--bengos-surface-sunken)] px-3 disabled:opacity-60 ${
          error ? "border-[var(--bengos-danger)]" : "border-[var(--bengos-border)]"
        }`}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
