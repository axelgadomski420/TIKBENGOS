/**
 * Znak marki BENGOS — jedno miejsce, w którym wskazujemy grafikę.
 *
 * ── DLACZEGO LINK, A NIE PLIK W REPOZYTORIUM ────────────────────────────
 * Grafiki leżą na zewnętrznym hostingu, a nie w `public/brand/`. Decyzja
 * należy do właściciela projektu i ma swoją cenę, którą trzeba znać:
 * **aplikacja zależy od zewnętrznego serwisu.** Jeśli obrazy znikną albo
 * hosting zmieni zasady, znak przestanie się wczytywać — strona nadal
 * będzie działać, ale z pustym miejscem po logo.
 *
 * Dlatego wszystkie odwołania przechodzą przez ten plik. Przeprowadzka na
 * pliki lokalne to zmiana JEDNEJ wartości w `logo`, a nie szukanie adresów
 * po całym kodzie. To jest cały powód istnienia tego pliku.
 *
 * ── `logo` JEST UŻYWANE W TRZECH MIEJSCACH ──────────────────────────────
 * 1. Zasłona startowa (`layout.tsx`) — pokazuje się przed pierwszą klatką.
 * 2. Nagłówek powłoki (`app-shell.tsx`) — stały znak obok nazwy.
 * 3. Ekran logowania (`login/page.tsx`) — jedyny ekran bez nagłówka.
 *
 * ── PO CO `logo` I `logoWide` ───────────────────────────────────────────
 * Wersja znaku z podpisami modułów („ustawienia”, „muzyka”, „chat”…)
 * nadaje się wyłącznie na duże powierzchnie. W pasku o wysokości 40 px te
 * napisy są nieczytelne i zamieniają się w szum — dlatego interfejs używa
 * prostszej wersji, a szersza zostaje w rezerwie.
 *
 * ── ADRESY SĄ PRZEPISANE Z PANELU HOSTINGU ──────────────────────────────
 * Oba to linki bezpośrednie do plików (`i.ibb.co/...`), a nie do strony
 * podglądu (`ibb.co/...`). Różnica nie jest kosmetyczna: pod pierwszym
 * leży obraz JPEG, pod drugim dokument HTML — a `<img src>` wskazujący na
 * dokument HTML nie wyświetli niczego.
 */
export const BRAND = {
  /** Znak prosty: głowa w kuli z napisem BENGOS. Nagłówek, ekran startowy, logowanie. */
  logo: "https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg",
  /** Znak z podpisami modułów — na duże powierzchnie, gdy będzie taka potrzeba. */
  logoWide:
    "https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;
