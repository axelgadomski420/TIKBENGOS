"use client";

import { useState, useCallback } from "react";
import type { Metadata } from "next";

import { validateUsername, validateEmail, validatePassword } from "@bengos/core";
import { apiFetch, type ApiError } from "@/lib/api-client";
import { useSession } from "@/providers/session-provider";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Ekran logowania i rejestracji.
 *
 * - Przełączany tryb: logowanie / rejestracja
 * - Logowanie: jedno pole identifier (username albo email), password
 * - Rejestracja: username, email, password
 * - Walidacja PRZED wysłaniem: używa funkcji z @bengos/core
 * - Błędy: role="alert", aria-invalid na polach
 * - Po sukcesie: window.location.assign("/")
 */

type Mode = "login" | "register";

interface FormData {
  identifier: string;
  username: string;
  email: string;
  password: string;
}

const INITIAL_FORM: FormData = {
  identifier: "",
  username: "",
  email: "",
  password: "",
};

export default function LoginPage() {
  const { logout } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerError(null);
  }, []);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setForm(INITIAL_FORM);
    setErrors({});
    setServerError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "login") {
      if (!form.identifier.trim()) {
        newErrors.identifier = "Nazwa użytkownika lub email jest wymagana.";
      }
      if (!form.password) {
        newErrors.password = "Hasło jest wymagane.";
      }
    } else {
      const usernameError = validateUsername(form.username);
      if (usernameError) {
        newErrors.username = usernameError.message;
      }
      const emailError = validateEmail(form.email);
      if (emailError) {
        newErrors.email = emailError.message;
      }
      const passwordError = validatePassword(form.password);
      if (passwordError) {
        newErrors.password = passwordError.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [mode, form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoading(true);
      setServerError(null);

      try {
        if (mode === "login") {
          await apiFetch<unknown>("/api/auth/login", {
            method: "POST",
            body: {
              identifier: form.identifier.trim(),
              password: form.password,
            },
          });
        } else {
          await apiFetch<unknown>("/api/auth/register", {
            method: "POST",
            body: {
              username: form.username.trim(),
              email: form.email.trim(),
              password: form.password,
            },
          });
        }
        window.location.assign("/");
      } catch (cause: unknown) {
        if (cause instanceof Error && "error" in cause) {
          const apiError = (cause as { error: ApiError }).error;
          setServerError(apiError);
          if (apiError.field) {
            setErrors((prev) => ({ ...prev, [apiError.field]: apiError.message }));
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [mode, form, validateForm],
  );

  return (
    <div className="mx-auto max-w-md w-full px-4 py-12">
      <h1 className="text-[var(--bengos-size-display)] font-[var(--bengos-weight-semibold)] text-center">
        {mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
      </h1>

      <div
        role="tablist"
        className="flex gap-1 mt-6 justify-center"
        aria-label="Wybierz tryb"
      >
        <button
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => handleModeChange("login")}
          disabled={loading}
          className="bengos-touch-target px-4 py-2 rounded-[var(--bengos-radius-control)] text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] disabled:opacity-50 data-[selected=true]:bg-[var(--bengos-surface-raised)] data-[selected=true]:border data-[selected=true]:border-[var(--bengos-border-strong)]"
          data-selected={mode === "login"}
        >
          Zaloguj się
        </button>
        <button
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => handleModeChange("register")}
          disabled={loading}
          className="bengos-touch-target px-4 py-2 rounded-[var(--bengos-radius-control)] text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] disabled:opacity-50 data-[selected=true]:bg-[var(--bengos-surface-raised)] data-[selected=true]:border data-[selected=true]:border-[var(--bengos-border-strong)]"
          data-selected={mode === "register"}
        >
          Zarejestruj się
        </button>
      </div>

      {serverError && !serverError.field && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 p-3 bg-[var(--bengos-danger)]/10 border border-[var(--bengos-danger)] rounded-[var(--bengos-radius-control)] text-[var(--bengos-danger)]"
        >
          {serverError.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "login" ? (
          <>
            <div>
              <label
                htmlFor="identifier"
                className="block text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] mb-1"
              >
                Nazwa użytkownika lub email
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete={mode === "login" ? "username" : "off"}
                value={form.identifier}
                onChange={(e) => handleFieldChange("identifier", e.target.value)}
                aria-invalid={!!errors.identifier}
                aria-describedby={errors.identifier ? "identifier-error" : undefined}
                disabled={loading}
                className="bengos-touch-target w-full px-3 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-surface-sunken)] border border-[var(--bengos-border)] text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bengos-focus-ring)] disabled:opacity-50"
              />
              {errors.identifier && (
                <p
                  id="identifier-error"
                  role="alert"
                  className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]"
                >
                  {errors.identifier}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] mb-1"
              >
                Hasło
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={loading}
                className="bengos-touch-target w-full px-3 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-surface-sunken)] border border-[var(--bengos-border)] text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bengos-focus-ring)] disabled:opacity-50"
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]"
                >
                  {errors.password}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <label
                htmlFor="username"
                className="block text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] mb-1"
              >
                Nazwa użytkownika
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(e) => handleFieldChange("username", e.target.value)}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                disabled={loading}
                className="bengos-touch-target w-full px-3 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-surface-sunken)] border border-[var(--bengos-border)] text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bengos-focus-ring)] disabled:opacity-50"
              />
              {errors.username && (
                <p
                  id="username-error"
                  role="alert"
                  className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]"
                >
                  {errors.username}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={loading}
                className="bengos-touch-target w-full px-3 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-surface-sunken)] border border-[var(--bengos-border)] text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bengos-focus-ring)] disabled:opacity-50"
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]"
                >
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-[var(--bengos-size-body)] font-[var(--bengos-weight-medium)] mb-1"
              >
                Hasło
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                disabled={loading}
                className="bengos-touch-target w-full px-3 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-surface-sunken)] border border-[var(--bengos-border)] text-[var(--bengos-text)] placeholder:text-[var(--bengos-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--bengos-focus-ring)] disabled:opacity-50"
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1 text-[var(--bengos-danger)] text-[var(--bengos-size-caption)]"
                >
                  {errors.password}
                </p>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bengos-touch-target w-full mt-2 px-4 py-2 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] text-[var(--bengos-text-on-accent)] font-[var(--bengos-weight-medium)] disabled:opacity-50"
        >
          {mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
        </button>
      </form>
    </div>
  );
}
