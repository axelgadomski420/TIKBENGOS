/**
 * Znak marki BENGOS — jedno miejsce, w którym wskazujemy grafikę.
 *
 * ── TRZY GRAFIKI, TRZY ZASTOSOWANIA ─────────────────────────────────────
 * 1. `logo` — tygrys w kuli z napisem BENGOS, BEZ podpisów modułów. Znak
 *    w nagłówku powłoki i w kole na ekranie startowym. Wersja bez podpisów
 *    jest tu konieczna: w kole o średnicy 80 px napisy obcięłyby się
 *    do połowy i wyglądałyby na uszkodzony obraz.
 * 2. `login` — kompozycja z napisami „logowanie” i „rejestracja”. Należy do
 *    ekranu startowego i tylko tam.
 * 3. `menu` — kompozycja z podpisami modułów. Tło nagłówka na pulpicie;
 *    prawdziwe, klikalne wejścia stoją pod nią jako siatka tekstu.
 *
 * ── PLIKI LOKALNE (aktualizacja 2026-11-09) ─────────────────────────────
 * Grafiki właściciela (JPEG 1024×1024) zostały wgrane do `public/brand/`
 * i wskazują na lokalne ścieżki. To eliminuje zewnętrzne połączenie TLS
 * przy każdym wejściu i gwarantuje, że znak jest dostępny nawet offline
 * (PWA). Poprzednie wartości na i.ibb.co zostają w komentarzu jako historia.
 *
 * Ta sama zasada co wcześniej: żywy tekst (logowanie/rejestracja, etykiety
 * modułów) jest prawdziwym HTML, nie wypalonym w obrazie — dla dostępności.
 */
export const BRAND = {
  /** Tygrys w kuli, bez podpisów modułów — lokalny plik. */
  logo: "/brand/logo.jpg",
  /** Kompozycja ekranu logowania z napisami (używana jako tło lub referencja). */
  login: "/brand/login.jpg",
  /** Kompozycja menu z podpisami modułów dookoła. */
  menu: "/brand/menu.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;