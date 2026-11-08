/**
 * Znak marki BENGOS — jedno miejsce, w którym wskazujemy grafikę.
 *
 * ── PLIKI SĄ LOKALNE, NIE Z ZEWNĘTRZNEGO HOSTINGU ──────────────────────
 * Grafiki leżały wcześniej na `i.ibb.co` i to było źródłem trzech kosztów
 * naraz: dodatkowego połączenia TLS przy każdym wejściu (LCP), braku
 * zarezerwowanego miejsca (CLS) i zależności od serwisu, który może zniknąć
 * razem z logo. Teraz pliki są w `public/brand/` i jadą z tej samej domeny.
 *
 * ── FORMAT DO ZROBIENIA ─────────────────────────────────────────────────
 * Pliki są JPEG. Docelowo AVIF i WebP — przy 1024×1024 różnica to setki
 * kilobajtów, a to bezpośrednio przekłada się na LCP. Konwersja wymaga
 * narzędzia, którego nie było w środowisku budującym, więc zostaje jako
 * świadome zadanie, a nie zapomnienie.
 *
 * ── TRZY GRAFIKI, TRZY ZASTOSOWANIA ─────────────────────────────────────
 * 1. `logo`  — znak: głowa tygrysa w kuli z napisem BENGOS. Nagłówek powłoki,
 *    koło nad kartą logowania, ikona instalowanej aplikacji.
 * 2. `login` — kompozycja z podpisami „logowanie" i „rejestracja". Należy do
 *    ekranu startowego i TYLKO tam: w nagłówku te napisy są szumem, a obok
 *    prawdziwego przycisku myliłyby użytkownika.
 * 3. `menu`  — kompozycja z podpisami modułów. Tło nagłówka na pulpicie;
 *    prawdziwe, klikalne wejścia stoją pod nią jako siatka.
 */
export const BRAND = {
  /** Znak: głowa w kuli z napisem BENGOS. */
  logo: "/brand/menu.jpg",
  /** Kompozycja logowania z podpisami „logowanie" i „rejestracja". */
  login: "/brand/login.jpg",
  /** Kompozycja pulpitu z podpisami modułów. */
  menu: "/brand/menu.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;
