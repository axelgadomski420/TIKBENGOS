"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { fromMorse, toMorse } from "@bengos/core";

import { BRANCHES } from "@/components/home/module-branches";

export function SearchDesk() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const hits = useMemo(
    () =>
      BRANCHES.filter((branch) =>
        !needle ? true : (branch.label + " " + branch.description).toLowerCase().includes(needle),
      ),
    [needle],
  );
  const morse = needle ? toMorse(query) : "";

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold text-[var(--bengos-accent)]">Wyszukiwarka</h1>
      <input
        className="min-h-11 w-full rounded-md border border-[var(--bengos-border)] bg-[var(--bengos-surface-sunken)] px-3"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Moduł, pytanie albo tekst do Morse'a"
        aria-label="Szukaj"
      />
      <ul className="space-y-2">
        {hits.map((branch) => (
          <li key={branch.label}>
            <Link href={branch.href} className="block rounded-md border border-[var(--bengos-border)] px-3 py-3">
              <span className="font-medium">{branch.label}</span>
              <span className="mt-1 block text-sm text-[var(--bengos-text-muted)]">{branch.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      {morse ? (
        <p className="text-sm">
          Morse: {morse}
          <span className="mt-1 block opacity-80">Odczyt: {fromMorse(morse)}</span>
        </p>
      ) : null}
    </section>
  );
}
