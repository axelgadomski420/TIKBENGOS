import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Zaloguj się" };

/**
 * Ekran logowania i rejestracji.
 *
 * Ten plik celowo nie ma "use client". Eksport `metadata` jest dozwolony
 * wyłącznie w komponencie serwerowym — próba połączenia go z "use client"
 * kończy się błędem budowania, nie ostrzeżeniem. Dlatego cała logika
 * formularza mieszka w `@/components/auth/login-form`, a tutaj zostaje
 * tylko to, co serwerowe.
 *
 * ── ZNAK NAD FORMULARZEM ────────────────────────────────────────────────
 * Ekran logowania jest jedynym miejscem, w którym użytkownik nie widzi
 * jeszcze nagłówka powłoki — a więc i jedynym, gdzie znak musi stać nad
 * treścią, żeby było wiadomo, do czego się loguje. Bez niego formularz
 * wisiałby w pustce.
 *
 * Obraz jest dekoracją (`alt=""`), bo nazwa stoi pod nim tekstem:
 * czytnik ekranu usłyszałby „BENGOS” dwa razy.
 */
export default function LoginPage() {
  return (
    <div className="bengos-rise mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/bengos-logo.jpg"
          alt=""
          width={88}
          height={88}
          className="size-22 rounded-full object-cover object-top"
        />
        <p className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-semibold)] tracking-[0.14em]">
          BENGOS
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
        <Link href="/" className="text-[var(--bengos-accent)]">
          Wróć do BENGOS Home
        </Link>
      </p>
    </div>
  );
}
