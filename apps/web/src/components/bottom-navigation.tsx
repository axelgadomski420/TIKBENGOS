"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Miejsca docelowe w dolnej nawigacji.
 *
 * Pięć, nie siedem. Rozwidlenia z BENGOS Home to siedem modułów, ale
 * nawigacja dolna pokazuje pięć miejsc, w których użytkownik bywa stale —
 * Studio, Dev i Access są celami, do których się wchodzi z pulpitu.
 */
const DESTINATIONS = [
  { href: "/", label: "Home", hint: "Pulpit" },
  { href: "/feed", label: "Feed", hint: "Wideo i posty" },
  { href: "/create", label: "Create", hint: "Asystent i tworzenie" },
  { href: "/chat", label: "Chat", hint: "Rozmowy" },
  { href: "/profile", label: "Profile", hint: "Twoja tożsamość" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bengos-border)] bg-[var(--bengos-surface-raised)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between">
        {DESTINATIONS.map((destination) => {
          const active =
            destination.href === "/"
              ? pathname === "/"
              : pathname === destination.href || pathname.startsWith(`${destination.href}/`);
          return (
            <li key={destination.href} className="flex-1">
              <Link
                href={destination.href}
                aria-current={active ? "page" : undefined}
                className={`bengos-touch-target flex-col gap-0.5 text-[var(--bengos-size-caption)] transition-colors duration-[var(--bengos-motion-fast)] ${
                  active
                    ? "text-[var(--bengos-accent)] font-[var(--bengos-weight-medium)]"
                    : "text-[var(--bengos-text-muted)]"
                }`}
              >
                <span aria-hidden="true">{destination.label}</span>
                <span className="bengos-visually-hidden">{destination.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
