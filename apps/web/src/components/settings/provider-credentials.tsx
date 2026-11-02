"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ApiError } from "@bengos/core";
import { PROVIDERS, PROVIDER_KIND_LABELS, validateProviderKey, type ProviderKind } from "@bengos/core";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

/**
 * Klucze do zewnętrznych dostawców.
 *
 * Trzy rzeczy, które ten ekran musi robić dobrze:
 *
 * 1. Pokazać CAŁĄ listę dostawców, także tych bez potwierdzonego adresu.
 *    Wpis bez adresu da się zapisać, ale wywołania nie będzie — użytkownik
 *    ma to wiedzieć przed zapisem, nie po. Ukrycie takich wpisów byłoby
 *    prostsze i mniej uczciwe.
 * 2. Pokazać wartość klucza DOKŁADNIE RAZ, z ostrzeżeniem, że drugi raz
 *    się nie pokaże, i pozwolić ją skopiować.
 * 3. Nigdy nie żądać adresu dostawcy. Adres pochodzi z katalogu, bo inaczej
 *    dałoby się kazać serwerowi wysłać żądanie na adres wewnętrzny.
 */

interface SavedCredential {
  id: string;
  providerId: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface CreatedCredential extends SavedCredential {
  secret: string;
}

const KIND_ORDER: ProviderKind[] = ["llm", "image", "speech", "music", "code"];

export function ProviderCredentials() {
  const [saved, setSaved] = useState<SavedCredential[]>([]);
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  const [providerId, setProviderId] = useState<string>(PROVIDERS[0]?.id ?? "");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [filter, setFilter] = useState("");
  const [formError, setFormError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedCredential | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [credentials, catalogue] = await Promise.all([
        apiFetch<SavedCredential[]>("/api/settings/providers/credentials"),
        apiFetch<{ id: string; hasBaseUrl: boolean }[]>("/api/settings/providers"),
      ]);
      setSaved(credentials);
      setProviders(Object.fromEntries(catalogue.map((entry) => [entry.id, entry.hasBaseUrl])));
    } catch (cause) {
      setLoadError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się wczytać kluczy." },
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const visible = needle
      ? PROVIDERS.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.id.toLowerCase().includes(needle) ||
            PROVIDER_KIND_LABELS[item.kind].toLowerCase().includes(needle),
        )
      : PROVIDERS;

    return KIND_ORDER.map((kind) => ({
      kind,
      items: visible.filter((item) => item.kind === kind),
    })).filter((group) => group.items.length > 0);
  }, [filter]);

  const selected = PROVIDERS.find((item) => item.id === providerId) ?? null;
  const selectedHasUrl = selected ? (providers[selected.id] ?? selected.baseUrl !== null) : false;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const local = validateProviderKey(providerId, key);
    if (local) {
      setFormError(local);
      return;
    }
    if (!name.trim()) {
      setFormError({ code: "bad_request", field: "name", message: "Nadaj nazwę kluczowi." });
      return;
    }

    setBusy(true);
    try {
      const created = await apiFetch<CreatedCredential>("/api/settings/providers/credentials", {
        method: "POST",
        body: { providerId, name: name.trim(), key: key.trim() },
      });

      // Klucz pokazujemy raz. Zapisany do listy trafia bez wartości.
      setJustCreated(created);
      setSaved((prev) => [created, ...prev]);
      setName("");
      setKey("");
    } catch (cause) {
      setFormError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się zapisać klucza." },
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await apiFetch<void>(`/api/settings/providers/credentials/${id}`, { method: "DELETE" });
      setSaved((prev) => prev.filter((item) => item.id !== id));
    } catch (cause) {
      setLoadError(
        cause instanceof ApiRequestError
          ? cause.error
          : { code: "internal", message: "Nie udało się usunąć klucza." },
      );
    }
  }

  return (
    <>
      {justCreated ? (
        <section
          aria-labelledby="revealed-title"
          className="bengos-surface-card bengos-glow-ring"
        >
          <h2 id="revealed-title" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
            Skopiuj teraz — ten klucz pokazuje się ostatni raz
          </h2>
          <p className="mt-2 text-[var(--bengos-text-muted)]">
            Serwer nie ma sposobu, żeby pokazać go ponownie. Po zamknięciu tej sekcji zobaczysz
            tylko jego początek i ostatnie cztery znaki.
          </p>
          <p
            className="mt-3 break-all rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3 py-2 font-[var(--bengos-font-mono)]"
          >
            {justCreated.secret}
          </p>
          <button
            type="button"
            onClick={() => setJustCreated(null)}
            className="bengos-touch-target mt-4 rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-4 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)]"
          >
            Skopiowałem, ukryj
          </button>
        </section>
      ) : null}

      <section aria-labelledby="add-key" className="bengos-surface-card">
        <h2 id="add-key" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Dodaj klucz dostawcy
        </h2>

        {loadError ? (
          <p role="alert" className="mt-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-3 py-2">
            {loadError.message}
          </p>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label htmlFor="provider-filter" className="block font-[var(--bengos-weight-medium)]">
              Filtruj listę
            </label>
            <input
              id="provider-filter"
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="np. openai, mowa, github"
              className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
            />
          </div>

          <div>
            <label htmlFor="provider-id" className="block font-[var(--bengos-weight-medium)]">
              Dostawca
            </label>
            <select
              id="provider-id"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
            >
              {grouped.map((group) => (
                <optgroup key={group.kind} label={PROVIDER_KIND_LABELS[group.kind]}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.baseUrl === null ? " — adres niepotwierdzony" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selected ? (
            <div className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 py-2">
              <p className="text-[var(--bengos-size-caption)]">{selected.note}</p>
              <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {selectedHasUrl
                  ? "Klucz będzie używany pod adresem: "
                  : "Bez potwierdzonego adresu klucz zapisze się, ale wywołania nie będzie. "}
                {selectedHasUrl && selected.baseUrl ? (
                  <span className="font-[var(--bengos-font-mono)] break-all">{selected.baseUrl}</span>
                ) : null}
              </p>
              <a
                href={selected.docsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-block text-[var(--bengos-size-caption)] text-[var(--bengos-accent)]"
              >
                Dokumentacja dostawcy
              </a>
            </div>
          ) : null}

          <div>
            <label htmlFor="credential-name" className="block font-[var(--bengos-weight-medium)]">
              Nazwa klucza
            </label>
            <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Do czego go użyjesz — np. „Studio”, „Bot”, „Testy”.
            </p>
            <input
              id="credential-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
            />
          </div>

          <div>
            <label htmlFor="credential-key" className="block font-[var(--bengos-weight-medium)]">
              Klucz
            </label>
            <p className="mt-1 text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
              Wklej klucz z panelu dostawcy. Zostanie zaszyfrowany na serwerze.
            </p>
            <input
              id="credential-key"
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              aria-invalid={formError?.field === "key" ? true : undefined}
              className="mt-1 min-h-[var(--bengos-touch-target-min)] w-full rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
            />
          </div>

          {formError ? (
            <p role="alert" className="rounded-[var(--bengos-radius-control)] border border-[var(--bengos-danger)] px-3 py-2 text-[var(--bengos-size-caption)]">
              {formError.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="bengos-touch-target w-full rounded-[var(--bengos-radius-control)] bg-[var(--bengos-accent)] px-5 font-[var(--bengos-weight-medium)] text-[var(--bengos-text-on-accent)] disabled:opacity-60"
          >
            {busy ? "Zapisuję…" : "Zapisz klucz"}
          </button>
        </form>
      </section>

      <section aria-labelledby="saved-keys" className="bengos-surface-card">
        <h2 id="saved-keys" className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]">
          Zapisane klucze
        </h2>

        {loading ? (
          <p role="status" className="mt-3 text-[var(--bengos-text-muted)]">
            Wczytuję klucze…
          </p>
        ) : saved.length === 0 ? (
          <p className="mt-3 text-[var(--bengos-text-muted)]">
            Nie masz jeszcze zapisanych kluczy. Po zapisie zobaczysz tu tylko początek
            i ostatnie cztery znaki — pełnej wartości nie pokaże już żaden ekran.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {saved.map((credential) => (
              <li
                key={credential.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 py-2"
              >
                <div className="flex-1">
                  <p className="font-[var(--bengos-weight-medium)]">{credential.name}</p>
                  <p className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                    {PROVIDERS.find((item) => item.id === credential.providerId)?.name ?? credential.providerId}
                    {" · "}
                    <span className="font-[var(--bengos-font-mono)]">
                      {credential.prefix}…{credential.lastFour}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(credential.id)}
                  className="bengos-touch-target rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-3 text-[var(--bengos-size-caption)]"
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
