"use client";

import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "@bengos/core";
import { validateEmail, validatePassword, validateUsername } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";
import { BRAND } from "@/lib/brand";

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
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.7-1.4-2.2-.2-4.6-1.1-4.6-4.3 0-.9.3-1.8.9-2.4-.2-.6-.4-1.5-.4-2.8 0-1.6.7-3 1.9-3.9-.2-.5-.9-1.5.1-3.1 0 0 1.6-.5 4.6 1.8A15.9 15.9 0 0 1 12 6.4c1.6 0 3.2.2 4.7.7 3-2.3 4.6-1.8 4.6-1.8 1 1.6.3 2.6.1 3.1 1.2.9 1.9 2.3 1.9 3.9 0 1.3-.2 2.2-.4 2.8.6.6.9 1.4.9 2.4 0 3.2-2.4 4.1-4.6 4.3.3.3.6.8.6 1.7V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"
        />
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
    <div className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-[28px] border border-[var(--bengos-border)] bg-[var(--bengos-surface)]/90 backdrop-blur-sm shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="border-b border-[var(--bengos-border)] bg-[linear-gradient(135deg,rgba(28,38,62,0.75),rgba(16,24,40,0.96))] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/20">
                <img src={BRAND.logo} alt="" className="size-full object-cover object-top" />
              </span>
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.32em] text-[var(--bengos-text-muted)]">BENGOS</p>
                <p className="text-sm font-medium text-white">One app. One identity.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              Wejdź bez konta
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="space-y-3">
            <div className="flex rounded-full border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  !isRegister
                    ? "bg-[var(--bengos-accent)] text-[var(--bengos-text-on-accent)] shadow"
                    : "text-[var(--bengos-text-muted)]"
                }`}
              >
                Logowanie
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  isRegister
                    ? "bg-[var(--bengos-accent)] text-[var(--bengos-text-on-accent)] shadow"
                    : "text-[var(--bengos-text-muted)]"
                }`}
              >
                Rejestracja
              </button>
            </div>

            {oauthError ? (
              <p role="alert" className="rounded-2xl border border-[var(--bengos-warning)] bg-[var(--bengos-warning)]/10 px-3 py-2 text-sm text-[var(--bengos-text)]">
                {oauthError.message}
              </p>
            ) : null}

            {providers.length > 0 ? (
              <div className="space-y-2">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={!provider.configured || busy || oauthBusy !== null}
                    onClick={() => void startOAuth(provider.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-4 py-3 text-sm font-medium text-[var(--bengos-text)] transition hover:border-[var(--bengos-accent)] hover:text-[var(--bengos-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ProviderMark id={provider.id} />
                    {oauthBusy === provider.id ? `Przechodzę do ${provider.label}…` : `Kontynuuj z ${provider.label}`}
                  </button>
                ))}
                <div className="flex items-center gap-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-[var(--bengos-text-muted)]">
                  <span className="h-px flex-1 bg-[var(--bengos-border)]" />
                  albo
                  <span className="h-px flex-1 bg-[var(--bengos-border)]" />
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            {serverError && !serverError.field ? (
              <p role="alert" className="rounded-2xl border border-[var(--bengos-danger)] bg-[var(--bengos-danger)]/10 px-3 py-2 text-sm text-[var(--bengos-text)]">
                {serverError.message}
              </p>
            ) : null}

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
                  label="Email"
                  type="email"
                  hint="Zostanie użyty do logowania i powiadomień."
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
                hint="Możesz użyć jednego z nich."
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
              hint={isRegister ? "Co najmniej 12 znaków." : "Wpisz swoje hasło."}
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
                  className="rounded-full px-2 text-xs font-medium text-[var(--bengos-text-muted)] transition hover:text-[var(--bengos-accent)]"
                >
                  {showPassword ? "Ukryj" : "Pokaż"}
                </button>
              }
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-[var(--bengos-accent)] px-4 py-3 text-sm font-semibold text-[var(--bengos-text-on-accent)] shadow-[0_12px_28px_rgba(115,127,255,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Pracuję…" : isRegister ? "Utwórz konto" : "Zaloguj się"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--bengos-text-muted)]">
            Masz już konto? <button type="button" onClick={() => switchMode("login")} className="font-medium text-[var(--bengos-accent)]">Zaloguj się</button>
          </p>
        </div>
      </div>
    </div>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--bengos-text)]">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mb-2 text-xs text-[var(--bengos-text-muted)]">
          {hint}
        </p>
      ) : null}
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 transition focus-within:border-[var(--bengos-accent)]">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? hintId}
          className="min-h-[var(--bengos-touch-target-min)] w-full border-0 bg-transparent px-0 py-2 text-sm text-[var(--bengos-text)] outline-none placeholder:text-[var(--bengos-text-muted)]"
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs text-[var(--bengos-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
