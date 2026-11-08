/**
 * Znak marki BENGOS — jedno miejsce, w którym wskazujemy grafikę.
 *
 * ── TU TRAFIAJĄ WSZYSTKIE ODWOŁANIA DO GRAFIK ───────────────────────────
 * Pliki leżą w `public/brand/` i jadą z tej samej domeny co aplikacja.
 * Wcześniej stały na `i.ibb.co`, a to kosztowało trzy rzeczy naraz:
 * dodatkowe połączenie TLS przy każdym wejściu (LCP), brak zarezerwowanego
 * miejsca na obraz (CLS) i możliwość, że serwis zniknie razem z logo.
 *
 * ── TRZY GRAFIKI ────────────────────────────────────────────────────────
 * 1. `logo`  — tygrys w kuli z napisem BENGOS, BEZ podpisów modułów. Znak
 *    w nagłówku powłoki i w kole na ekranie startowym. Wersja bez podpisów
 *    jest tu konieczna: w kole o średnicy 80 px napisy obcięte do połowy
 *    wyglądają jak uszkodzony obraz.
 * 2. `login` — kompozycja z napisami „logowanie" i „rejestracja". Należy do
 *    ekranu startowego i tylko tam.
 * 3. `menu`  — kompozycja z podpisami modułów. Tło nagłówka na pulpicie;
 *    prawdziwe, klikalne wejścia stoją pod nią jako siatka.
 *
 * ── FORMAT DO ZROBIENIA ─────────────────────────────────────────────────
 * Pliki są JPEG. Docelowo AVIF i WebP — przy 1024×1024 różnica to setki
 * kilobajtów, co przekłada się wprost na LCP. Zostaje jako świadome zadanie.
 */
export const BRAND = {
  /** Tygrys w kuli, bez podpisów. Znak powłoki i koło na logowaniu. */
  logo: "/brand/logo.jpg",
  /** Kompozycja logowania z napisami „logowanie" i „rejestracja". */
  login: "/brand/login.jpg",
  /** Kompozycja pulpitu z podpisami modułów. */
  menu: "/brand/menu.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;
