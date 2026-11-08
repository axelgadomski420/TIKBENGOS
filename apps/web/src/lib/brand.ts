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
 * ── DLACZEGO PLIKI LOKALNE, NIE Z HOSTINGU ──────────────────────────────
 * Grafiki stały wcześniej na `i.ibb.co` i kosztowały trzy rzeczy naraz:
 * dodatkowe połączenie TLS przy każdym wejściu (LCP), brak zarezerwowanego
 * miejsca na obraz (CLS) i możliwość, że serwis zniknie razem z logo.
 * Teraz leżą w `public/brand/` i jadą z tej samej domeny co aplikacja.
 *
 * ── HOSTING ZEWNĘTRZNY NA POLECENIE WŁAŚCICIELA (aktualizacja 2026-11-08) ─
 * Trzy pliki JPEG opisane wyżej nigdy nie wylądowały w `public/brand/`
 * (binarny obrazek nie da się wgrać przez API GitHuba jako tekst), więc
 * każdy `/brand/*.jpg` odpowiadał 404, a okręgi z tygrysem były puste.
 * Właściciel przekazał wtedy decyzję: dopóki JPEG-i nie wylądują
 * w repozytorium, znak wskazuje na jego grafikę na `i.ibb.co`
 * (1024×1024, JPG, 360 KB). Ostrzeżenia z sekcji powyżej nadal obowiązują
 * — powrót na pliki lokalne po wgraniu JPEG-ów to zmiana trzech wartości
 * poniżej.
 *
 * Ta sama grafika zasila dziś wszystkie trzy pola. `login` nie dostaje
 * kompozycji z wypalonymi napisami, bo prawdziwe „logowanie” i „rejestracja”
 * stoją na ekranie jako żywy tekst — wypalone pod nimi wyglądałyby jak
 * pomyłka podwójnego napisu. `menu` nie dostaje kompozycji z wypalonymi
 * podpisami modułów, bo prawdziwe podpisy są klikalną siatką na pulpicie.
 *
 * ── FORMAT DO ZROBIENIA ──────────────────────────────────────────────────
 * Pliki są JPEG. Docelowo AVIF i WebP — przy 1024×1024 różnica to setki
 * kilobajtów, co przekłada się wprost na LCP. Zostaje jako świadome zadanie.
 */
export const BRAND = {
  /** Tygrys w kuli, bez podpisów modułów — na hostingu właściciela (i.ibb.co). */
  logo: "https://i.ibb.co/FLTwttVz/44747202-085-E-42-B8-BE50-EF91-CAF448-F1.jpg",
  /** Znak marki jako tło ekranu logowania — bez wypalonych napisów (sekcja wyżej). */
  login: "https://i.ibb.co/FLTwttVz/44747202-085-E-42-B8-BE50-EF91-CAF448-F1.jpg",
  /** Znak marki dla pulpitu — podpisy modułów niesie prawdziwy klikalny tekst. */
  menu: "https://i.ibb.co/FLTwttVz/44747202-085-E-42-B8-BE50-EF91-CAF448-F1.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;
