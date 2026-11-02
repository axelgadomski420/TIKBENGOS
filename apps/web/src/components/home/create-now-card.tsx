import Link from "next/link";

/**
 * Karta „Stwórz teraz”.
 *
 * Cztery wejścia, każde do innego modułu, ale wszystkie wyglądają jak jedna
 * karta. To jest cała idea TIKBENGOS w jednym komponencie: cztery osobne
 * aplikacje nie są tu widoczne — widać cztery rzeczy, które można zrobić.
 */
const OPTIONS = [
  { href: "/studio/video", label: "Wideo", description: "Nagraj albo wgraj, dodaj napisy, opublikuj" },
  { href: "/studio/music", label: "Muzyka", description: "Opisz utwór, poczekaj, przypisz do wideo" },
  { href: "/studio/post", label: "Post", description: "Tekst, wideo albo dźwięk — z opisem dla ekranu bez obrazu" },
  { href: "/studio/project", label: "Projekt kodu", description: "Opisz funkcję, zobacz plan, zatwierdź pull request" },
];

export function CreateNowCard() {
  return (
    <section aria-labelledby="create-now" className="bengos-surface-card">
      <h2
        id="create-now"
        className="text-[var(--bengos-size-title)] font-[var(--bengos-weight-medium)]"
      >
        Stwórz teraz
      </h2>
      <ul className="mt-4 space-y-2">
        {OPTIONS.map((option) => (
          <li key={option.href}>
            <Link
              href={option.href}
              className="flex min-h-[var(--bengos-touch-target-min)] flex-col justify-center rounded-[var(--bengos-radius-control)] border border-[var(--bengos-border)] px-4 py-2 transition-colors duration-[var(--bengos-motion-fast)] hover:border-[var(--bengos-border-strong)]"
            >
              <span className="font-[var(--bengos-weight-medium)]">{option.label}</span>
              <span className="text-[var(--bengos-size-caption)] text-[var(--bengos-text-muted)]">
                {option.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
