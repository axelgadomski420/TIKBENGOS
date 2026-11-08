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
 * pliki lokalne to zmiana wartości w `logo` i `login`, a nie szukanie
 * adresów po całym kodzie. To jest cały powód istnienia tego pliku.
 *
 * ── TRZY GRAFIKI, TRZY ZASTOSOWANIA ────────────────────────────────────
 * 1. `logo` — znak prosty: głowa tygrysa w kuli z napisem BENGOS. Nagłówek
 *    powłoki, zasłona startowa, ikona instalowanej aplikacji.
 * 2. `login` — pełna kompozycja z podpisami „logowanie” i „rejestracja”.
 *    Należy do ekranu logowania i TYLKO tam: w nagłówku te napisy są
 *    nieczytelnym szumem, a ich powtórzenie obok prawdziwego przycisku
 *    myliłoby użytkownika.
 * 3. `home` — kompozycja z podpisami modułów (ustawienia, muzyka, chat,
 *    wyszukiwarka). Wypełnia tło pulpitu po zalogowaniu.
 *
 * ── ADRESY SĄ LINKAMI BEZPOŚREDNIMI ────────────────────────────────────
 * Każdy zaczyna się od `i.ibb.co/…` — to adres PLIKU. Adres `ibb.co/…`
 * prowadzi do strony podglądu, czyli dokumentu HTML, a `<img src>`
 * wskazujący na HTML nie wyświetli niczego. Pomyłka tych dwóch form
 * kosztowała już jedną rundę.
 */
export const BRAND = {
  /** Znak prosty: głowa w kuli z napisem BENGOS. */
  logo: "https://i.ibb.co/bMZh3YJs/C57-AC4-F4-7-D83-4-F5-D-890-F-00-BB1-F79-D6-F3.jpg",
  /** Kompozycja logowania z podpisami „logowanie” i „rejestracja”. */
  login:
    "https://i.ibb.co/7dmxK4qt/C894714-D-AE6-F-4-BC6-8-B09-373-B4-EF5-D811.jpg",
  /** Kompozycja pulpitu z podpisami modułów. */
  home: "https://i.ibb.co/TxDg2pFH/44747202-085-E-42B8-BE50-EF91CAF448-F1.jpg",
  name: "BENGOS",
  tagline: "Jeden społecznościowy system operacyjny.",
} as const;
